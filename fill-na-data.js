/**
 * @fileoverview This script finds all N/A entries across ALL mutual funds
 * and fills them with the correct data from AMFI reports.
 * Run this periodically (every 2 days) to maintain data integrity.
 */
function fillNAData() {
  const sheetName = "Nav";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${sheetName}" not found.`);
    return;
  }

  // Define all funds with their AMFI codes
  const fundsToTrack = {
    "ICICI Pru BA": "120377",
    "HDFC Mid-Cap": "118989",
    "Nippon Small Cap": "118778",
    "UTI Nifty 50": "120716",
    "PPFAS Flexi Cap": "122639"
  };

  // Indian market holidays are now centralized in holidays.gs
  // Reference the centralized function

  // Get header row to find NAV columns for all funds
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  Logger.log("=".repeat(60));
  Logger.log("🔍 SCANNING FOR N/A VALUES ACROSS ALL FUNDS");
  Logger.log("=".repeat(60));

  // Find column indices for all funds
  const fundColumns = {};
  Object.keys(fundsToTrack).forEach(fund => {
    const colIdx = headers.findIndex(h => h.includes(fund) && h.includes("NAV")) + 1;
    if (colIdx > 0) {
      fundColumns[fund] = {
        index: colIdx,
        code: fundsToTrack[fund],
        header: headers[colIdx - 1]
      };
      Logger.log(`✅ ${fund}: Column ${colIdx}`);
    } else {
      Logger.log(`⚠️ ${fund}: NOT FOUND`);
    }
  });

  // Get all data from sheet
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const dateColIndex = 0;

  let totalUpdates = 0;
  const fundUpdates = {};

  // For each fund, find and fill N/A entries
  Object.entries(fundColumns).forEach(([fundName, fundInfo]) => {
    Logger.log(`\n📊 Processing ${fundName}...`);
    const updates = [];

    // Find all N/A entries for this fund
    for (let i = 0; i < data.length; i++) {
      const cellValue = data[i][fundInfo.index - 1];
      
      if (cellValue === "N/A") {
        const rowDate = new Date(data[i][dateColIndex]);
        const formattedDate = Utilities.formatDate(rowDate, "GMT+5:30", "yyyy-MM-dd");
        
        Logger.log(`  ⚠️ N/A found on ${formattedDate} (Row ${i + 2})`);

        // Try to fetch data for this date and earlier dates
        let foundNav = null;
        
        for (let dayOffset = 0; dayOffset <= 5; dayOffset++) {
          const fetchDate = new Date(rowDate);
          fetchDate.setDate(fetchDate.getDate() - dayOffset);
          
          if (isWeekendOrHoliday(fetchDate)) continue;

          const formattedFetchDate = Utilities.formatDate(fetchDate, "GMT+5:30", "dd-MMM-yyyy");
          const url = `https://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx?frmdt=${formattedFetchDate}`;

          try {
            const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
            const content = response.getContentText();

            if (response.getResponseCode() === 200 && content && !content.includes("No data found")) {
              const lines = content.split("\n");
              const navLine = lines.find(l => l.includes(fundInfo.code + ";"));

              if (navLine) {
                const parts = navLine.split(";");
                
                // Try to extract NAV from various positions
                for (let j = 2; j < Math.min(parts.length, 10); j++) {
                  const candidate = parseFloat(parts[j]);
                  if (!isNaN(candidate) && candidate > 0) {
                    foundNav = candidate;
                    Logger.log(`    ✅ Found: ${foundNav} (from ${formattedFetchDate})`);
                    break;
                  }
                }

                if (!foundNav) {
                  foundNav = parseFloat(parts[parts.length - 1]);
                  if (!isNaN(foundNav) && foundNav > 0) {
                    Logger.log(`    ✅ Found (last pos): ${foundNav}`);
                  }
                }
              }

              if (foundNav) break;
            }
          } catch (e) {
            Logger.log(`    ❌ Error fetching ${formattedFetchDate}: ${e.message}`);
          }
        }

        if (foundNav) {
          updates.push({
            row: i + 2,
            col: fundInfo.index,
            value: foundNav,
            date: formattedDate
          });
        } else {
          Logger.log(`    ❌ Could not find data for ${formattedDate}`);
        }
      }
    }

    // Apply updates for this fund
    if (updates.length > 0) {
      Logger.log(`  📝 Applying ${updates.length} updates for ${fundName}...`);
      updates.forEach(update => {
        sheet.getRange(update.row, update.col).setValue(update.value);
        Logger.log(`    Updated Row ${update.row}: ${update.date} = ${update.value}`);
      });
      fundUpdates[fundName] = updates.length;
      totalUpdates += updates.length;
    } else {
      Logger.log(`  ✅ No N/A entries for ${fundName}`);
    }
  });

  // Summary
  Logger.log(`\n${"=".repeat(60)}`);
  Logger.log(`📈 SUMMARY`);
  Logger.log(`${"=".repeat(60)}`);
  
  Object.entries(fundUpdates).forEach(([fund, count]) => {
    Logger.log(`${fund}: ${count} entries updated`);
  });
  
  Logger.log(`\n🎉 TOTAL UPDATES: ${totalUpdates}`);
  Logger.log(`${"=".repeat(60)}\n`);

  if (totalUpdates > 0) {
    SpreadsheetApp.getUi().alert(`✅ Successfully updated ${totalUpdates} N/A entries across all funds!`);
  } else {
    SpreadsheetApp.getUi().alert("✅ No N/A entries found. All data is complete!");
  }
}
