const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { cargarEntorno } = require('../config/entorno');
const { pistaDeConexion } = require('../config/db');

const SEMILLA = [
  {
    slug: 'relojes',
    nombre: 'Cronógrafo Noir',
    descripcion: 'Reloj de esfera negra con cronógrafo, índices finos y correa de cuero. Una pieza sobria para el uso diario.',
    precio: '289000.00',
    imagen: '/assets/img/productos/cronografo-noir.svg'
  },
  {
    slug: 'relojes',
    nombre: 'Clásico Áureo',
    descripcion: 'Caja dorada, esfera clara y correa de cuero. Pensado para quien prefiere una presencia discreta.',
    precio: '349000.00',
    imagen: '/assets/img/productos/clasico-aureo.svg'
  },
  {
    slug: 'relojes',
    nombre: 'Acero Minimal',
    descripcion: 'Caja delgada de acero y malla milanesa. Lectura limpia, sin adornos de más.',
    precio: '219000.00',
    imagen: '/assets/img/productos/acero-minimal.svg'
  },
  {
    slug: 'relojes',
    nombre: 'Campo Titanio',
    descripcion: 'Caja ligera, esfera oscura y resistencia pensada para acompañar el día completo.',
    precio: '399000.00',
    imagen: '/assets/img/productos/campo-titanio.svg'
  },
  {
    slug: 'lociones',
    nombre: 'Esencia Ámbar',
    descripcion: 'Fragancia cálida con ámbar, vainilla y un fondo de maderas suaves.',
    precio: '89000.00',
    imagen: '/assets/img/productos/esencia-ambar.svg'
  },
  {
    slug: 'lociones',
    nombre: 'Bruma Cítrica',
    descripcion: 'Salida fresca de bergamota y naranja, ligera para el día.',
    precio: '76000.00',
    imagen: '/assets/img/productos/bruma-citrica.svg'
  },
  {
    slug: 'lociones',
    nombre: 'Noche de Sándalo',
    descripcion: 'Sándalo, especias suaves y maderas. Pensada para la noche.',
    precio: '98000.00',
    imagen: '/assets/img/productos/noche-sandalo.svg'
  },
  {
    slug: 'lociones',
    nombre: 'Aqua Serena',
    descripcion: 'Aroma acuático y limpio, con un fondo suave que permanece cerca de la piel.',
    precio: '82000.00',
    imagen: '/assets/img/productos/aqua-serena.svg'
  }
];

function dividirSentencias(sql) {
  const sinComentarios = sql
    .split(/\r?\n/)
    .filter((linea) => !linea.trim().startsWith('--'))
    .join('\n');
  return sinComentarios
    .split(';')
    .map((parte) => parte.trim())
    .filter(Boolean);
}

// Crea la base, las tablas y el catálogo inicial si todavía no hay productos.
async function main() {
  const entorno = cargarEntorno();
  let conexion;
  try {
    conexion = await mysql.createConnection({
      host: entorno.db.host,
      port: entorno.db.port,
      user: entorno.db.user,
      password: entorno.db.password,
      multipleStatements: false,
      charset: 'utf8mb4',
      timezone: 'Z'
    });

    await conexion.query(
      `CREATE DATABASE IF NOT EXISTS \`${entorno.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conexion.query(`USE \`${entorno.db.database}\``);

    const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8');
    for (const sentencia of dividirSentencias(sql)) {
      await conexion.query(sentencia);
    }

    await conexion.query(
      `INSERT IGNORE INTO categorias (nombre, slug, descripcion) VALUES
       (?, ?, ?),
       (?, ?, ?)`,
      [
        'Relojes', 'relojes', 'Relojes para distintos estilos.',
        'Lociones', 'lociones', 'Perfumes y lociones.'
      ]
    );

    const [conteo] = await conexion.query('SELECT COUNT(*) AS total FROM productos');
    if (Number(conteo[0].total) === 0) {
      for (const producto of SEMILLA) {
        const [categorias] = await conexion.query(
          'SELECT id_categoria FROM categorias WHERE slug = ? LIMIT 1',
          [producto.slug]
        );
        await conexion.query(
          `INSERT INTO productos (nombre, id_categoria, descripcion, precio, imagen, activo)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [
            producto.nombre,
            categorias[0].id_categoria,
            producto.descripcion,
            producto.precio,
            producto.imagen
          ]
        );
      }
      console.log('Catálogo inicial creado.');
    } else {
      console.log('La base ya tenía productos. No se volvió a sembrar el catálogo.');
    }

    console.log('Base de datos lista. Si aún no hay administrador, ejecuta npm run crear-admin.');
  } catch (error) {
    console.error(`No se pudo preparar MySQL (${error.code || 'error'}). ${pistaDeConexion(error)}`);
    process.exitCode = 1;
  } finally {
    if (conexion) await conexion.end();
  }
}

main();
