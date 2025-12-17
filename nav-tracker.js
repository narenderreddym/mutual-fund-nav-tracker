/**
 * @fileoverview This Google Apps Script tracks NAV data, analyzes trends, 
 * and sends alerts for mutual fund buying opportunities.
 * 
 * Main function features:
 * 1. Fetches latest NAV data from AMFI
 * 2. Calculates moving averages (30, 50, 200 days)
 * 3. Identifies buying opportunities based on dips
 * 4. Sends email alerts for significant opportunities
 */
function getNAVAndAnalyze() {
  // ======= CONFIGURATION =======
  const sheetName = "Nav";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  // Validate sheet exists
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${sheetName}" not found. Please create it.`);
    return;
  }

  // Configure buy signal thresholds and opportunity scores
  const SEVERITY = {
    STRONG_BUY: 7,    // >7% dip - Exceptional buying opportunity
    GOOD_BUY: 5,      // >5% dip - Strong buying opportunity
    MODERATE_BUY: 3   // >3% dip - Potential buying opportunity
  };

  // Define market condition weights for opportunity scoring
  const MARKET_WEIGHTS = {
    PRICE_DIP: 0.4,        // Weight for price dip below MA
    TREND_STRENGTH: 0.3,   // Weight for trend strength
    MA_ALIGNMENT: 0.3      // Weight for MA alignment (30D vs 50D vs 200D)
  };

  // Check if the sheet exists
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${sheetName}" not found. Please create it.`);
    return;
  }

  // This section was removed as it's a duplicate of the SEVERITY configuration above

  // ======= FUND CONFIGURATION =======
  // Mutual funds to track with their AMFI codes
  const fundsToTrack = {
    "ICICI Pru BA": "120377",     // Balanced Advantage Fund
    "HDFC Mid-Cap": "118989",     // Mid Cap Opportunities
    "Nippon Small Cap": "118778", // Small Cap Fund
    "UTI Nifty 50": "120716",    // Index Fund
    "PPFAS Flexi Cap": "122639"  // Flexicap Fund
  };

  const fundNames = Object.keys(fundsToTrack);

  // Moving average periods for trend analysis
  const maPeriods = [
    30,  // Short-term trend
    50,  // Medium-term trend
    200  // Long-term trend
  ];

  // Prepare headers for the Google Sheet
  const navHeaders = fundNames.map(f => `${f} NAV`);
  const maHeaders = fundNames.flatMap(f => [
    `${f} 30D-MA`,
    `${f} 50D-MA`,
    `${f} 200D-MA`
  ]);
  const alertHeaders = fundNames.map(f => `${f} Analysis`);
  // Lump Sum Suggestion headers are completely removed

  const headerRow = ["Date", ...navHeaders, ...maHeaders, ...alertHeaders]; // Removed lumpSumHeaders

  // Always set the header row to ensure correct column names
  sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
  
  // Format headers to make them more readable
  const headerRange = sheet.getRange(1, 1, 1, headerRow.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#E8EAF6");  // Changed to a more visible light indigo color
  headerRange.setFontColor("#000000");   // Black text for contrast
  headerRange.setWrap(true);
  headerRange.setHorizontalAlignment("center");  // Center-align headers
  headerRange.setBorder(true, true, true, true, true, true, "#9FA8DA", SpreadsheetApp.BorderStyle.SOLID);  // Add borders
  
  // Freeze the header row
  sheet.setFrozenRows(1);
  
  // Auto-resize columns for header text
  sheet.autoResizeColumns(1, headerRow.length);
  
  // Log all headers for verification
  Logger.log("Headers set:");
  headerRow.forEach((header, index) => {
    Logger.log(`Column ${index + 1}: ${header}`);
  });

  // ======= HOLIDAY CONFIGURATION =======
  // Holidays are now managed in holidays.gs file
  // Reference the centralized holiday list

  /**
   * Checks if a given date is a weekend or a defined Indian holiday.
   * @param {Date} date - The date to check.
   * @returns {boolean} True if it's a weekend or holiday, false otherwise.
   */
  function isWeekendOrHolidayLocal(date) {
    return isWeekendOrHoliday(date); // Use the centralized function from holidays.gs
  }

  let rawNavData = null;
  let fetchedDate = null;

  // Try to fetch NAV data for the most recent trading day
  // Iterates back up to 5 days to find the last valid trading day's data
  for (let i = 1; i <= 5; i++) {
    const dateToFetch = new Date();
    dateToFetch.setDate(dateToFetch.getDate() - i); // Go back 'i' days
    if (isWeekendOrHolidayLocal(dateToFetch)) continue; // Skip weekends and holidays

    const formattedDate = Utilities.formatDate(dateToFetch, "GMT+5:30", "dd-MMM-yyyy");
    const url = `https://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx?frmdt=${formattedDate}`;

    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const content = response.getContentText();

      // Check if response is successful and contains valid data
      if (response.getResponseCode() === 200 && content && !content.includes("No data found")) {
        rawNavData = content.split("\n");
        fetchedDate = dateToFetch;
        Logger.log(`✅ Successfully fetched NAV data for ${formattedDate}`);
        break; // Found data, stop searching
      } else {
        Logger.log(`⚠️ No data found or error for ${formattedDate}. Response code: ${response.getResponseCode()}`);
      }
    } catch (e) {
      Logger.log(`❌ Error fetching NAV data for ${formattedDate}: ${e.message}`);
    }
  }

  // If no data was successfully fetched, alert and exit
  if (!rawNavData) {
    SpreadsheetApp.getUi().alert("Failed to fetch NAV data for the last 5 trading days. Please try again later.");
    return;
  }

  const currentFormattedDate = Utilities.formatDate(fetchedDate, "GMT+5:30", "yyyy-MM-dd");

  // Read existing data from the sheet (excluding header row)
  // This is crucial for calculating moving averages and detecting crossovers
  const lastRowIndex = sheet.getLastRow();
  let dataRange = [];
  if (lastRowIndex > 1) { // If there's data beyond the header
    dataRange = sheet.getRange(2, 1, lastRowIndex - 1, sheet.getLastColumn()).getValues();
  }

  // Check for duplicate entry to prevent re-adding data for the same day
  const existingDates = dataRange.map(row => Utilities.formatDate(new Date(row[0]), "GMT+5:30", "yyyy-MM-dd"));
  if (existingDates.includes(currentFormattedDate)) {
    Logger.log(`⚠ Duplicate entry detected for ${currentFormattedDate}. Skipping insertion.`);
    return;
  }

  // Prepare the new row for today's data
  const newNavRow = [fetchedDate]; // Date column

  // Populate NAVs for the new row
  fundNames.forEach(fund => {
    const code = fundsToTrack[fund];
    // Find the line in the raw data corresponding to the fund's AMFI code
    const line = rawNavData.find(l => l.startsWith(code + ";"));
    let nav = NaN;
    if (line) {
      const parts = line.split(";");
      // NAV can be in different positions depending on the AMFI report structure
      nav = parseFloat(parts[4]) || parseFloat(parts[5]) || parseFloat(parts.at(-1));
    }
    newNavRow.push(isNaN(nav) ? "N/A" : nav);
  });

  // Append empty placeholders for MAs and Alerts (Lump Sum Suggestions removed)
  const numMACols = fundNames.length * maPeriods.length;
  const numAlertCols = fundNames.length;
  newNavRow.push(...Array(numMACols + numAlertCols).fill("")); // Removed numLumpCols

  // Define column indices early for N/A checking
  const navStartIdx = 1; // After Date column

  // Append the new row to the sheet
  sheet.appendRow(newNavRow);

  // Check if any fund has N/A values for this date
  let hasNAValues = false;
  for (let i = 0; i < fundNames.length; i++) {
    if (newNavRow[navStartIdx + i] === "N/A") {
      hasNAValues = true;
      Logger.log(`⚠️ N/A detected for ${fundNames[i]}`);
    }
  }

  // If N/A values found, remove the incomplete row and retry with earlier data
  if (hasNAValues) {
    Logger.log(`🔄 Incomplete data detected. Attempting to fetch from earlier dates...`);
    sheet.deleteRow(sheet.getLastRow()); // Remove the incomplete row
    
    // Retry fetching from up to 10 days back to get complete data
    for (let retryI = i + 1; retryI <= 10; retryI++) {
      const dateToRetry = new Date();
      dateToRetry.setDate(dateToRetry.getDate() - retryI);
      if (isWeekendOrHoliday(dateToRetry)) continue;

      const formattedRetryDate = Utilities.formatDate(dateToRetry, "GMT+5:30", "dd-MMM-yyyy");
      const retryUrl = `https://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx?frmdt=${formattedRetryDate}`;

      try {
        const retryResponse = UrlFetchApp.fetch(retryUrl, { muteHttpExceptions: true });
        const retryContent = retryResponse.getContentText();

        if (retryResponse.getResponseCode() === 200 && retryContent && !retryContent.includes("No data found")) {
          Logger.log(`✅ Retrying with data from ${formattedRetryDate}`);
          rawNavData = retryContent.split("\n");
          fetchedDate = dateToRetry;
          
          // Rebuild the NAV row with retry data
          const retryNavRow = [fetchedDate];
          let completeData = true;
          
          fundNames.forEach(fund => {
            const code = fundsToTrack[fund];
            const line = rawNavData.find(l => l.includes(code + ";"));
            let nav = NaN;
            
            if (line) {
              const parts = line.split(";");
              for (let j = 2; j < Math.min(parts.length, 10); j++) {
                const candidate = parseFloat(parts[j]);
                if (!isNaN(candidate) && candidate > 0) {
                  nav = candidate;
                  break;
                }
              }
              if (isNaN(nav)) {
                nav = parseFloat(parts[parts.length - 1]);
              }
            }
            
            if (isNaN(nav)) {
              completeData = false;
            }
            retryNavRow.push(isNaN(nav) ? "N/A" : nav);
          });

          // Only proceed if we got complete data
          if (completeData) {
            // Check for duplicate entry
            const retryFormattedDate = Utilities.formatDate(fetchedDate, "GMT+5:30", "yyyy-MM-dd");
            const dataRange2 = sheet.getLastRow() > 1 ? 
              sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues() : [];
            const existingDates2 = dataRange2.map(row => Utilities.formatDate(new Date(row[0]), "GMT+5:30", "yyyy-MM-dd"));
            
            if (!existingDates2.includes(retryFormattedDate)) {
              // Add placeholders for MAs and Alerts
              retryNavRow.push(...Array(numMACols + numAlertCols).fill(""));
              sheet.appendRow(retryNavRow);
              newNavRow = retryNavRow; // Update reference for subsequent processing
              Logger.log(`✅ Successfully inserted complete data from ${formattedRetryDate}`);
              break;
            } else {
              Logger.log(`⚠️ Data from ${formattedRetryDate} already exists. Skipping.`);
            }
          } else {
            Logger.log(`⚠️ Data from ${formattedRetryDate} still has N/A values. Retrying...`);
          }
        }
      } catch (e) {
        Logger.log(`❌ Retry failed for ${formattedRetryDate}: ${e.message}`);
      }
    }
  }

  // --- Calculate Moving Averages and Alerts ---
  // Re-read dataRange including the newly appended row for MA calculations
  dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  // Calculate column indices for data types
  const maStartIdx = navStartIdx + fundNames.length; // After NAV columns
  const ma30StartIdx = maStartIdx;
  const ma50StartIdx = ma30StartIdx + fundNames.length;
  const ma200StartIdx = ma50StartIdx + fundNames.length;
  const alertStartIdx = maStartIdx + numMACols;

  // Log column indices for debugging
  Logger.log(`Column indices: NAV starts at ${navStartIdx}, MA starts at ${maStartIdx}, Alerts start at ${alertStartIdx}`);
  Logger.log(`Total columns: ${headerRow.length}`);

  const currentDayMAsForSheet = []; // This will hold all calculated MAs for the current day
  const alertMsgs = [];
  const alertBgs = [];
  // lumpSumSuggestions array and related logic removed

  fundNames.forEach((fund, i) => {
    const navColIdx = navStartIdx + i; // Column index for the current fund's NAV
    const latestNav = parseFloat(newNavRow[navColIdx]); // Latest NAV for this fund

    let currentFundMAs = {}; // Object to store MAs for the current fund (current day)
    let previousFundMAs = {}; // Object to store MAs for the current fund (previous day)

    // Calculate current day's MAs for the current fund
    maPeriods.forEach((period, pIdx) => {
      let ma = "N/A";
      if (dataRange.length >= period) {
        const navsForMA = dataRange.slice(-period).map(row => parseFloat(row[navColIdx])).filter(v => !isNaN(v));

        if (navsForMA.length === period) { // Ensure we have enough valid NAVs
          ma = (navsForMA.reduce((a, b) => a + b, 0) / period).toFixed(4);
        }
      }
      currentFundMAs[period] = parseFloat(ma); // Store as number for calculations
      currentDayMAsForSheet.push(ma); // Store as string for sheet display
    });

    // Fetch previous day's MA values from the `dataRange` (last row before current)
    if (dataRange.length > 1) { // Ensure there's at least one previous data row
      const prevRowData = dataRange[dataRange.length - 2]; // Get the second to last row (previous day's data)
      maPeriods.forEach((period, pIdx) => {
        // Calculate the correct column index for previous MA
        const prevMAColIdx = maStartIdx + (i * maPeriods.length) + pIdx;
        previousFundMAs[period] = parseFloat(prevRowData[prevMAColIdx]);
      });
    }

    let alerts = [];
    let bg = "#ffffff"; // Default background color

    if (!isNaN(latestNav)) {
      // Calculate opportunity score and analyze buying signals
      let opportunityScore = 0;
      let maxDipPercentage = 0;
      let maAlignmentScore = 0;
      
      // Check dips against each MA period
      maPeriods.forEach(period => {
        if (!isNaN(currentFundMAs[period])) {
          const diff = ((latestNav - currentFundMAs[period]) / currentFundMAs[period] * 100).toFixed(2);
          const diffValue = Math.abs(parseFloat(diff));
          
          // Track maximum dip percentage
          if (latestNav < currentFundMAs[period] && diffValue > maxDipPercentage) {
            maxDipPercentage = diffValue;
          }
          
          // Calculate MA alignment score
          if (period === 30 && latestNav > currentFundMAs[period]) maAlignmentScore += 1;
          if (period === 50 && latestNav > currentFundMAs[period]) maAlignmentScore += 1;
          if (period === 200 && latestNav > currentFundMAs[period]) maAlignmentScore += 1;
        }
      });
      
      // Calculate trend strength score (0 to 1)
      const trendScore = !isNaN(currentFundMAs[30]) && !isNaN(currentFundMAs[50]) ? 
        Math.min(Math.abs(((currentFundMAs[30] - currentFundMAs[50]) / currentFundMAs[50] * 100)) / 5, 1) : 0;
      
      // Calculate final opportunity score (0 to 100)
      opportunityScore = (
        (maxDipPercentage / 10) * MARKET_WEIGHTS.PRICE_DIP +
        trendScore * MARKET_WEIGHTS.TREND_STRENGTH +
        (maAlignmentScore / 3) * MARKET_WEIGHTS.MA_ALIGNMENT
      ) * 100;
      
      // Generate buy signals based on opportunity score and dip percentage
      if (maxDipPercentage > SEVERITY.STRONG_BUY) {
        alerts.push(`🎯 EXCEPTIONAL BUYING OPPORTUNITY (Score: ${opportunityScore.toFixed(1)})\n` +
                   `• ${maxDipPercentage.toFixed(1)}% below MA - Significant value opportunity\n` +
                   `• Recommended: Consider larger lump sum alongside SIP`);
        bg = "#ff9999"; // Strong red for exceptional opportunity
      } else if (maxDipPercentage > SEVERITY.GOOD_BUY) {
        alerts.push(`🚀 STRONG BUYING OPPORTUNITY (Score: ${opportunityScore.toFixed(1)})\n` +
                   `• ${maxDipPercentage.toFixed(1)}% below MA - Good value entry point\n` +
                   `• Recommended: Consider moderate lump sum with SIP`);
        bg = "#ffcccc"; // Light red for strong opportunity
      } else if (maxDipPercentage > SEVERITY.MODERATE_BUY) {
        alerts.push(`📊 MODERATE BUYING OPPORTUNITY (Score: ${opportunityScore.toFixed(1)})\n` +
                   `• ${maxDipPercentage.toFixed(1)}% below MA - Potential value entry\n` +
                   `• Recommended: Consider small lump sum with SIP`);
        bg = "#ffeecc"; // Orange for moderate opportunity
      }

      // Check for MA crossovers
      if (!isNaN(currentFundMAs[30]) && !isNaN(currentFundMAs[50]) &&
          !isNaN(previousFundMAs[30]) && !isNaN(previousFundMAs[50])) {
        if (currentFundMAs[30] > currentFundMAs[50] && previousFundMAs[30] <= previousFundMAs[50]) {
          alerts.push('Golden Cross: 30-day MA crossed above 50-day MA 📈');
        } else if (currentFundMAs[30] < currentFundMAs[50] && previousFundMAs[30] >= previousFundMAs[50]) {
          alerts.push('Death Cross: 30-day MA crossed below 50-day MA 📉');
          bg = bg === "#ffffff" ? "#ffeecc" : bg;
        }
      }

      // Long-term trend check
      if (!isNaN(currentFundMAs[200]) && latestNav < currentFundMAs[200]) {
        alerts.push(`Price below 200-day MA - Long-term downtrend ⚠️`);
        bg = bg === "#ffffff" ? "#ffeecc" : bg;
      }
    }

    alertMsgs.push(alerts.join('\n'));
    alertBgs.push(bg);

    // Lump Sum Suggestion logic is removed
  });

  // Update the MAs and Alerts in the newly added row
  const currentRow = sheet.getLastRow();
  
  // Update Moving Averages
  if (currentDayMAsForSheet.length > 0) {
    const maRange = sheet.getRange(currentRow, maStartIdx + 1, 1, currentDayMAsForSheet.length);
    maRange.setValues([currentDayMAsForSheet]);
    Logger.log(`Updated MAs in columns ${maStartIdx + 1} to ${maStartIdx + currentDayMAsForSheet.length}`);
  }

  // Update Alerts
  if (alertMsgs.length > 0) {
    // Calculate the correct starting column for alerts
    const alertRange = sheet.getRange(currentRow, alertStartIdx + 1, 1, alertMsgs.length);
    alertRange.setValues([alertMsgs]);
    alertRange.setBackgrounds([alertBgs]); // Apply background colors
    Logger.log(`Updated Alerts in columns ${alertStartIdx + 1} to ${alertStartIdx + alertMsgs.length}`);
    
    // Format alert cells for better readability
    alertRange.setWrap(true);
    alertRange.setVerticalAlignment('top');
  }
  // Lump Sum Suggestions update removed

  // --- Email Notification ---
  const marketSnapshot = [];
  const criticalAlerts = [];
  const warningAlerts = [];
  const otherAlerts = [];

  fundNames.forEach((fund, i) => {
    const navVal = newNavRow[navStartIdx + i];
    const ma30 = currentDayMAsForSheet[i * maPeriods.length + maPeriods.indexOf(30)] || "N/A";
    const ma50 = currentDayMAsForSheet[i * maPeriods.length + maPeriods.indexOf(50)] || "N/A";
    const ma200 = currentDayMAsForSheet[i * maPeriods.length + maPeriods.indexOf(200)] || "N/A";
    const alertMsg = alertMsgs[i];

    // Calculate daily price change
    const prevNav = dataRange.length > 0 ? 
      parseFloat(dataRange[dataRange.length - 1][navStartIdx + i]) : NaN;
    
    // Calculate percentage change with direction indicator
    const navChange = !isNaN(prevNav) && !isNaN(navVal) ? 
      ((navVal - prevNav) / prevNav * 100).toFixed(2) : null;
    
    // Format change string with arrow indicator
    const navChangeStr = navChange ? 
      ` (${navChange}% ${parseFloat(navChange) > 0 ? '↑' : '↓'} 1d)` : '';

    // Calculate trend strength
    const trendStrength = !isNaN(ma30) && !isNaN(ma50) ? 
      ((parseFloat(ma30) - parseFloat(ma50)) / parseFloat(ma50) * 100).toFixed(2) : null;
    let trendIndicator = '→ Neutral';
    if (trendStrength) {
      const strength = parseFloat(trendStrength);
      if (Math.abs(strength) < 0.5) trendIndicator = '→ Neutral';
      else if (strength > 0) trendIndicator = strength > 1 ? '↑↑ Strong Bull' : '↑ Weak Bull';
      else trendIndicator = strength < -1 ? '↓↓ Strong Bear' : '↓ Weak Bear';
    }

    // Add to market snapshot
    const snapshotDetails = [
      `🔹 ${fund}`,
      `   Current NAV: ₹${navVal}${navChangeStr}`,
      `   30-Day MA: ₹${ma30}`,
      `   50-Day MA: ₹${ma50}`,
      `   200-Day MA: ₹${ma200}`,
      `   Trend: ${trendIndicator}${trendStrength ? ` (30MA ${trendStrength}% ${parseFloat(trendStrength) > 0 ? 'above' : 'below'} 50MA)` : ''}`
    ];
    marketSnapshot.push(snapshotDetails.join('\n'));

    // Categorize alerts by severity
    if (alertMsg) {
      if (alertMsg.includes('🚨')) {
        criticalAlerts.push(`${fund}:\n${alertMsg}`);
      } else if (alertMsg.includes('⚠️')) {
        warningAlerts.push(`${fund}:\n${alertMsg}`);
      } else {
        otherAlerts.push(`${fund}:\n${alertMsg}`);
      }
    }
  });

  if (criticalAlerts.length > 0 || warningAlerts.length > 0 || otherAlerts.length > 0) {
    const emailBody = `
Hi Narendar,

📊 Market Snapshot for ${currentFormattedDate}
${criticalAlerts.length > 0 || warningAlerts.length > 0 ? 
  `Alerts: ${criticalAlerts.length} Critical 🚨, ${warningAlerts.length} Warning ⚠️` : 
  'No significant alerts'}

${marketSnapshot.join("\n\n")}

${criticalAlerts.length > 0 ? `
🚨 CRITICAL ALERTS
${criticalAlerts.join("\n\n")}` : ''}

${warningAlerts.length > 0 ? `
⚠️ WARNING ALERTS
${warningAlerts.join("\n\n")}` : ''}

${otherAlerts.length > 0 ? `
ℹ️ OTHER ALERTS
${otherAlerts.join("\n\n")}` : ''}

Remember to combine this with your own research and financial goals.

- Your Enhanced NAV Tracker
`.trim();

    MailApp.sendEmail({
      to: "mnarendar125@gmail.com",
      subject: `📊 Mutual Fund Analysis – ${currentFormattedDate}${criticalAlerts.length > 0 ? ' 🚨' : warningAlerts.length > 0 ? ' ⚠️' : ''}`,
      body: emailBody
    });
    Logger.log("📧 Email alert sent successfully.");
  } else {
    Logger.log("✅ No significant alerts today. No email sent.");
  }

  // Auto-resize columns for better readability
  sheet.autoResizeColumns(1, sheet.getLastColumn());
  Logger.log("Script finished.");
} // End of getNAVAndAnalyze function
