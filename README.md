# Mutual Fund NAV Tracker

A Google Apps Script project for tracking mutual fund Net Asset Value (NAV) data, analyzing trends, and sending alerts for buying opportunities.

## Features

- ✅ **Automated NAV Data Fetching** - Fetches latest NAV data from AMFI daily
- ✅ **Moving Averages** - Calculates 30-day, 50-day, and 200-day moving averages
- ✅ **Buying Signals** - Identifies buying opportunities based on price dips
- ✅ **Email Alerts** - Sends notifications for significant market opportunities
- ✅ **N/A Data Recovery** - Automatically fills missing data from earlier trading days
- ✅ **Centralized Holiday Management** - Support for NSE/BSE market holidays (2025-2026)
- ✅ **Trend Analysis** - Golden Cross, Death Cross, and long-term trend detection

## Tracked Mutual Funds

1. ICICI Pru BA (120377) - Balanced Advantage Fund
2. HDFC Mid-Cap (118989) - Mid Cap Opportunities
3. Nippon Small Cap (118778) - Small Cap Fund
4. UTI Nifty 50 (120716) - Index Fund
5. PPFAS Flexi Cap (122639) - Flexicap Fund

## Project Structure

```
├── nav-tracker.js          # Main script - Fetches NAV, calculates MAs, sends alerts
├── fill-na-data.js         # Data recovery script - Fills N/A values for all funds
├── holidays.gs             # Centralized holiday configuration (2025-2026)
└── README.md               # This file
```

## Files Overview

### nav-tracker.js
Main script that runs daily to:
- Fetch latest NAV data from AMFI
- Calculate moving averages
- Generate buying signals
- Send email alerts
- Handle market holidays and weekends

**Run:** `getNAVAndAnalyze()`

### fill-na-data.js
Data maintenance script that:
- Scans all funds for N/A values
- Retrieves missing data from AMFI archives
- Updates incomplete entries automatically
- Runs every 2 days (recommended)

**Run:** `fillNAData()`

### holidays.gs
Centralized holiday management:
- Contains all NSE/BSE market holidays for 2025-2026
- Provides reusable helper functions
- Single source of truth for all scripts

**Functions:**
- `getMarketHolidays()` - Returns array of holiday dates
- `isWeekendOrHoliday(date)` - Checks if date is weekend or holiday

## Usage

### Setting Up

1. Clone this repository:
   ```bash
   git clone https://github.com/narenderreddym/mutual-fund-nav-tracker.git
   ```

2. Copy scripts to Google Apps Script:
   - Go to [Google Apps Script](https://script.google.com/)
   - Create a new project
   - Copy contents of all three files (.js and .gs)
   - Save the project

3. Create a Google Sheet named "Nav":
   - Create columns: Date, and NAV/MA/Analysis columns for each fund
   - The script will auto-create headers on first run

4. Set up email notifications:
   - Update the email address in `nav-tracker.js` (line ~450)
   - Change: `to: "your-email@gmail.com"`

### Configuration

#### Email Alerts
Edit in `nav-tracker.js`:
```javascript
MailApp.sendEmail({
  to: "your-email@gmail.com",
  subject: `📊 Mutual Fund Analysis – ${currentFormattedDate}...`,
  body: emailBody
});
```

#### Buying Opportunity Thresholds
Edit in `nav-tracker.js`:
```javascript
const SEVERITY = {
  STRONG_BUY: 7,    // >7% dip - Exceptional buying opportunity
  GOOD_BUY: 5,      // >5% dip - Strong buying opportunity
  MODERATE_BUY: 3   // >3% dip - Potential buying opportunity
};
```

#### Update Holiday Dates
Edit in `holidays.gs`:
```javascript
function getMarketHolidays() {
  return [
    "2025-01-26", // Add/remove dates as needed
    "2026-03-03",
    // ...
  ];
}
```

## Schedule

Recommended schedule in Google Apps Script:
- **Daily at 4 PM (EOD):** Run `getNAVAndAnalyze()` - Fetch and analyze NAV
- **Every 2 days at 9 AM:** Run `fillNAData()` - Fill any N/A entries

## Data Structure

### NAV Sheet Columns
```
Date | ICICI Pru BA NAV | HDFC Mid-Cap NAV | Nippon Small Cap NAV | UTI Nifty 50 NAV | PPFAS Flexi Cap NAV |
     | ICICI 30D-MA     | ICICI 50D-MA     | ICICI 200D-MA        |                   |                      |
     | ... (MA columns for each fund) ...                                                                       |
     | ICICI Analysis   | HDFC Analysis    | ... (Analysis for each fund) ...                                |
```

## Alert Logic

The script generates alerts based on:

1. **Price Dips** - Compares current NAV vs moving averages
2. **Trend Strength** - Analyzes 30-day vs 50-day MA difference
3. **MA Alignment** - Checks if price is above all moving averages
4. **Crossovers** - Golden Cross (bullish) and Death Cross (bearish)
5. **Long-term Trend** - Price vs 200-day MA comparison

Alert Categories:
- 🎯 **EXCEPTIONAL** (>7% below MA)
- 🚀 **STRONG** (5-7% below MA)
- 📊 **MODERATE** (3-5% below MA)
- 📈 **Golden Cross** - 30MA above 50MA
- 📉 **Death Cross** - 30MA below 50MA
- ⚠️ **Long-term Downtrend** - Below 200-day MA

## Troubleshooting

### N/A Values in Sheet
Run `fillNAData()` to automatically fill missing data:
- Scans all funds for N/A
- Fetches from AMFI archives
- Retries up to 5 earlier trading days

### Data Not Updating
1. Check if today is a market holiday or weekend
2. Verify internet connection
3. Check AMFI website is accessible
4. Review execution logs in Apps Script

### Email Not Sending
- Verify email address is correct
- Check Gmail account security settings
- Ensure Google Account has email permissions

## Requirements

- Google Account with Apps Script access
- Google Sheet for data storage
- Internet connection for AMFI data fetching

## Data Sources

- **NAV Data:** AMFI (Association of Mutual Funds in India)
- **Holidays:** NSE/BSE official calendar

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Make improvements
4. Commit changes (`git commit -m 'Add improvement'`)
5. Push to the branch (`git push origin feature/improvement`)
6. Open a Pull Request

## Version History

### v2.1.0 (Dec 17, 2025)
- ✨ Added `fill-na-data.js` for automatic N/A recovery
- ✨ Created centralized `holidays.gs` for all market holidays
- 📅 Added support for 2026 NSE/BSE holidays
- 🔧 Improved code maintainability and reusability

### v2.0.0
- Added moving average calculations
- Implemented buying opportunity scoring
- Added email alert functionality

### v1.0.0
- Initial release
- Basic NAV tracking

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on [GitHub](https://github.com/narenderreddym/mutual-fund-nav-tracker/issues)
- Review the script logs in Google Apps Script for debugging

## Author

Created by Narendar for automated mutual fund NAV tracking and analysis.

---

**Last Updated:** December 17, 2025
