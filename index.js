require('dotenv').config()

const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const pkg = require('pg')
const { Pool } = pkg

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const app = express()
app.use(cors())
app.use('/uploads', express.static('uploads'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())


const uploadsDir = 'uploads/'

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir)  // Usa a pasta uploads
    },
    filename: (req, file, cb) => {
        // Renomeia o arquivo para evitar conflito
        const ext = path.extname(file.originalname)
        const nomeArquivo = `${Date.now()}${ext}`
        cb(null, nomeArquivo)
    }
})

const upload = multer({ storage })

app.get('/lugares', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM lugares ORDER BY id DESC')
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.post('/lugar', upload.fields([
    { name: 'imagem', maxCount: 1 },
]), async (req, res) => {

    let { img, nome, categoria, endereco, telefone } = req.body

    try {

        await pool.query(
            `INSERT INTO lugares (img, nome, categoria, endereco,telefone) VALUES ($1, $2, $3, $4, $5)`,
            [img.filename, nome, categoria, endereco, telefone]
        );

        res.status(201).json({ message: "Criado com sucesso" })
    } catch (error) {
        res.status(500).json({ message: "Erro no servidor" })
    }
})


app.delete('/deletarLugar/:id', async (req, res) => {

    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT img FROM lugares WHERE id = $1', [id])

        if (rows.length === 0) return res.status(404).json({ error: 'Img não encontrada' })

        const img = rows[0];
        const imgPath = path.join(uploadsDir, img);

        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

        await pool.query('DELETE FROM lugares WHERE id = $1', [id]);

        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

app.listen(3000, () => {

    console.log('Servidor rodando')


})