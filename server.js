const express = require('express');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware to parse JSON and enable CORS
app.use(express.json());
app.use(cors());

// Specify your local file path for the Excel file
const filePath = 'C:/Users/rkris/OneDrive/Desktop/bmi_data.xlsx';
console.log(`Using file path: ${filePath}`);

// Ensure the directory exists
const dir = path.dirname(filePath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
}

// Check if the Excel file exists, if not create it with headers
if (!fs.existsSync(filePath)) {
    const initialData = [["Date", "Name", "Age", "Height (cm)", "Weight (kg)", "BMI"]];
    const ws = XLSX.utils.aoa_to_sheet(initialData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BMI Data");
    XLSX.writeFile(wb, filePath);
    console.log(`Created new Excel file at: ${filePath}`);
}

app.post('/save-bmi', (req, res) => {
    try {
        const { date, name, age, height, weight, bmi } = req.body;

        // Validate the incoming data
        if (!date || !name || !age || !height || !weight || !bmi) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        console.log(`Reading Excel file from: ${filePath}`);
        // Read the existing Excel file or create a new one
        let wb;
        if (fs.existsSync(filePath)) {
            wb = XLSX.readFile(filePath);
        } else {
            throw new Error(`Excel file not found at ${filePath}`);
        }

        // Check if the "BMI Data" sheet exists, if not create it
        let ws = wb.Sheets["BMI Data"];
        if (!ws) {
            console.log("BMI Data sheet not found, creating a new one");
            const initialData = [["Date", "Name", "Age", "Height (cm)", "Weight (kg)", "BMI"]];
            ws = XLSX.utils.aoa_to_sheet(initialData);
            XLSX.utils.book_append_sheet(wb, ws, "BMI Data");
            XLSX.writeFile(wb, filePath); // Save the file with the new sheet
            wb = XLSX.readFile(filePath); // Re-read the file to ensure the sheet is loaded
            ws = wb.Sheets["BMI Data"];
        }

        let existingData = XLSX.utils.sheet_to_json(ws, { header: 1 });
        console.log(`Existing data in Excel file: ${JSON.stringify(existingData)}`);

        // Append the new data
        const newRow = [date, name, age, height, weight, bmi];
        existingData.push(newRow);
        console.log(`New data to append: ${JSON.stringify(newRow)}`);

        // Update the worksheet
        const newWs = XLSX.utils.aoa_to_sheet(existingData);
        wb.Sheets["BMI Data"] = newWs;

        // Write back to the file
        console.log(`Writing updated data to Excel file: ${filePath}`);
        XLSX.writeFile(wb, filePath);

        // Verify the file was updated by reading it again
        const updatedWb = XLSX.readFile(filePath);
        const updatedWs = updatedWb.Sheets["BMI Data"];
        const updatedData = XLSX.utils.sheet_to_json(updatedWs, { header: 1 });
        console.log(`Data after writing: ${JSON.stringify(updatedData)}`);

        // Check if the new row is in the updated data
        const lastRow = updatedData[updatedData.length - 1];
        if (JSON.stringify(lastRow) !== JSON.stringify(newRow)) {
            throw new Error("New data was not written to the Excel file");
        }

        console.log(`Appended data to Excel file: ${JSON.stringify({ date, name, age, height, weight, bmi })}`);
        res.json({ success: true, message: "Data saved successfully" });
    } catch (error) {
        console.error("Error saving data to Excel:", error.message);
        res.status(500).json({ success: false, message: "Error saving data to Excel: " + error.message });
    }
});

// Serve the index.html file
app.use(express.static(__dirname));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});