const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8001;


app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
// }))

// backend routes
app.use('/api', require('./routes/api/'));
app.use('/api/sync', require('./routes/api/sync'));
app.use('/api/auth', require('./routes/api/auth'));

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
  });
