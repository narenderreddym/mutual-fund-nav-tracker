# Mutual Fund NAV Tracker

A Google Apps Script project for tracking mutual fund Net Asset Value (NAV) data.

## Features

- Fetches mutual fund NAV data from external sources
- Stores and manages historical NAV records
- Calculates performance metrics
- Provides data visualization and reporting capabilities
- Automates data collection and updates

## Project Structure

- `mutual_fund_nav_tracker.gs` - Main Google Apps Script file containing all functions
- `README.md` - This file with project documentation

## Usage

### Setting Up

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/mutual-fund-nav-tracker.git
   ```

2. Copy the script to Google Apps Script:
   - Go to [Google Apps Script](https://script.google.com/)
   - Create a new project
   - Paste the contents of `mutual_fund_nav_tracker.gs`
   - Save and deploy

### Functions

The script includes various functions for:
- Fetching NAV data
- Processing fund information
- Generating reports
- Scheduling automated updates

## Configuration

Update the configuration variables in the script:
- API endpoints
- Fund symbols to track
- Update frequency
- Data storage settings

## Requirements

- Google Account with Apps Script access
- Spreadsheet for data storage (optional but recommended)
- Internet connection for data fetching

## Data Privacy

This project handles financial data. Ensure:
- Sensitive information is properly secured
- API keys are kept confidential
- Data is stored in secure Google Sheets

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

## Author

Created as a utility for tracking mutual fund performance and NAV data.

---

**Note:** Replace `yourusername` with your actual GitHub username in the clone URL.
