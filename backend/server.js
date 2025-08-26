const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const connectDB = require('./config/db')

const port = process.env.PORT || 3000;


const app = express();
app.use(express.json())

connectDB();

app.listen(port, ()=>{console.log(`Server running on : http://localhost:${port}`);});

app.get('/', (req,res)=>{
    //console.log("Server is running");
    const reading = req.query;
    res.send(reading)
})


app.use('/users', require('./routes/userRoutes'));
app.use('/products', require('./routes/productRoutes'));
app.use('/orders', require('./routes/orderRoutes'))