import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const { Client } = pg;

const db = new Client({
  user: "postgres",
  host: "localhost",
  database: "test",
  password: "Dafne123",
  port: 5433,
});

const app = express();
const port = 3000;
const masterKey = "4VGP2DN-6EWM4SJ-N6FGRHV-Z3PR3TT";
let lastInsertedIndex = -1; // Track the last inserted index
let people = [];

const connectToDatabase = async () => {
  try {
    await db.connect();
    console.log('Connected to the database');
  } catch (error) {
    console.error('Error connecting to the database:', error);
    throw error;
  }
};

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const fetchFromAPI = async () => {
  try {
    const response = await fetch("http://localhost:3000/all"); // Assuming an endpoint /all returns all data
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [data]; // Ensure data is an array
  } catch (error) {
    console.error('Error fetching data from API:', error);
    throw error;
  }
};

const insertDataIntoDB = async (data) => {
  try {
    if (!Array.isArray(data)) {
      throw new Error("Data is not an array");
    }

    // Sort data by index to maintain order
    data.sort((a, b) => a.index - b.index);

    for (const item of data) {
      console.log('Inserting data into DB:', item);
      const query = `
        INSERT INTO information (
          parentLastName, 
          parentFirstName,
          parentCurrentAddress
        ) 
        VALUES ( $1, $2, $3)
        RETURNING *;  -- Add RETURNING * to fetch the inserted row
        `;

      const values = [
        item.parentFirstName,
        item.parentLastName,
        item.parentCurrentAddress
        // Add more values as needed
      ];

      const result = await db.query(query, values);
      console.log('Data inserted successfully:', result.rows); // Log the inserted row
      lastInsertedIndex = item.index; // Update the last inserted index
    }
    
    console.log('Data inserted into SQL table successfully');
  } catch (error) {
    console.error('Error inserting data into SQL table:', error);
    throw error;
  }
};

// Export functions
export { connectToDatabase, fetchFromAPI, insertDataIntoDB };

// Route to fetch data from API and insert into the SQL table
app.post("/insert-from-api", async (req, res) => {
  try {
    const data = await fetchFromAPI();
    console.log('Data fetched from API:', data); // Added console.log
    await insertDataIntoDB(data);
    res.status(200).json({ message: 'Data inserted into SQL table successfully' });
  } catch (error) {
    console.error('Global error handler:', error); // Log the error
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

// Route to insert data into the API
app.post("/insert-to-api", async (req, res) => {
  const newPerson = {
    index: lastInsertedIndex + 1, // Assign index based on the last inserted index
    parentLastName: req.body.parentLastName,
    parentFirstName: req.body.parentFirstName,
    parentCurrentAddress: req.body.parentCurrentAddress
  };

  console.log('New person data:', newPerson); // Added console.log
  people.push(newPerson);
  console.log('People array:', people); // Added console.log
  res.json(newPerson);
});

// Route to delete all data
app.delete("/all", (req, res) => {
  const userKey = req.query.key;
  if (userKey === masterKey) {
    people = [];
    lastInsertedIndex = -1; // Reset the last inserted index
    res.sendStatus(200);
  } else {
    res.status(404).json({ error: `You are not authorised to perform this action.` });
  }
});

// Route to get all data
app.get("/all", (req, res) => {
  res.json(people);
});

// Start the Express server
(async () => {
  try {
    await connectToDatabase();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
})();
