const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'salao_beleza'
});

connection.connect((err) => {
    if (err) {
        console.error('❌ ERRO DE CONEXÃO:', err);
    } else {
        console.log('✅ CONECTADO AO MYSQL!');
        
        // Testar se o banco existe
        connection.query('SHOW TABLES', (err, results) => {
            if (err) {
                console.error('Erro na query:', err);
            } else {
                console.log('Tabelas encontradas:', results);
            }
            connection.end();
        });
    }
});