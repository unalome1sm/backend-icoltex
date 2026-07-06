/**
 * Inserta reseñas de demostración para un grupo vitrina.
 * Uso: npx tsx src/scripts/seedProductReviews.ts
 *      CODIGO=12170802 npx tsx src/scripts/seedProductReviews.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database';
import { CatalogVitrinaGroup } from '../models/CatalogVitrinaGroup';
import { ProductReview } from '../models/ProductReview';
import { User } from '../models/User';
import { encodeGroupId } from '../services/catalogVitrinaWebhook.service';

const CODIGO = process.env.CODIGO?.trim() || '12170802';
const SEED_TAG = 'seed-review-demo';

const SAMPLE_REVIEWS: { authorName: string; rating: number; comment: string; daysAgo: number }[] = [
  {
    authorName: 'Felipe Naranjo',
    rating: 5,
    comment:
      'Excelente producto\nLa tela TESLA RAYAS tiene muy buena caída y el estampado se ve igual que en la foto. Ideal para confeccionar blusas.',
    daysAgo: 2,
  },
  {
    authorName: 'María González',
    rating: 5,
    comment:
      'Muy buena calidad\nCompré varios metros para un vestido y quedó espectacular. La tela no se transparenta y cose muy bien.',
    daysAgo: 5,
  },
  {
    authorName: 'Carlos Ruiz',
    rating: 4,
    comment:
      'Buena relación precio-calidad\nEl material es suave al tacto. Solo le resto una estrella porque el color varía un poco entre rollos.',
    daysAgo: 8,
  },
  {
    authorName: 'Ana Lucía Pérez',
    rating: 5,
    comment:
      'Justo lo que buscaba\nLas rayas son uniformes y el tejido tiene buena elasticidad. Ya es la segunda vez que lo pido.',
    daysAgo: 12,
  },
  {
    authorName: 'Jorge Méndez',
    rating: 4,
    comment:
      'Recomendado para prendas casuales\nLlegó rápido y bien empacado. La tela aguanta bien el lavado en ciclo delicado.',
    daysAgo: 15,
  },
  {
    authorName: 'Laura Torres',
    rating: 5,
    comment:
      'Hermoso diseño\nEl patrón de rayas le da un look muy moderno a las prendas. Mis clientas quedaron encantadas.',
    daysAgo: 20,
  },
  {
    authorName: 'Diego Herrera',
    rating: 3,
    comment:
      'Cumple expectativas\nEs una buena tela para el precio, aunque esperaba un poco más de gramaje. Funciona bien para camisas ligeras.',
    daysAgo: 25,
  },
  {
    authorName: 'Patricia Silva',
    rating: 5,
    comment:
      'Perfecta para mi taller\nFácil de cortar y no se deshilacha. El código 12170802 coincide con lo que necesitaba para mi colección.',
    daysAgo: 30,
  },
  {
    authorName: 'Ricardo Vargas',
    rating: 4,
    comment:
      'Buen producto Icoltex\nLa textura es agradable y el estampado no se decolora con el primer lavado. Volveré a comprar.',
    daysAgo: 35,
  },
  {
    authorName: 'Sandra Jiménez',
    rating: 5,
    comment:
      'Superó mis expectativas\nUsé esta tela para uniformes y resistió muy bien el uso diario. Muy satisfecha con la compra.',
    daysAgo: 40,
  },
];

async function ensureSeedUser(index: number, authorName: string): Promise<mongoose.Types.ObjectId> {
  const email = `${SEED_TAG}-${index}@icoltex-demo.local`;
  let user = await User.findOne({ email });
  if (!user) {
    const passwordHash = await bcrypt.hash('demo123456', 10);
    user = await User.create({
      email,
      passwordHash,
      authProvider: 'local',
      nombre: authorName,
      activo: true,
    });
  }
  return user._id;
}

async function run() {
  await connectDatabase();

  const group = await CatalogVitrinaGroup.findOne({
    $or: [
      { 'variantes.codigo': CODIGO },
      { nombreVitrina: /TESLA\s+RAYAS/i },
    ],
  }).lean();

  if (!group) {
    console.error(`❌ No se encontró grupo vitrina con código ${CODIGO} o nombre TESLA RAYAS`);
    await mongoose.connection.close();
    process.exit(1);
  }

  const groupId = encodeGroupId(group.groupKey);
  console.log(`📦 Producto: ${group.nombreVitrina}`);
  console.log(`🔑 groupKey: ${group.groupKey}`);
  console.log(`🔗 groupId (URL tienda): ${groupId}`);
  console.log(`🌐 Ver en tienda: /shop/${groupId}`);

  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < SAMPLE_REVIEWS.length; i++) {
    const sample = SAMPLE_REVIEWS[i];
    const userId = await ensureSeedUser(i + 1, sample.authorName);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - sample.daysAgo);

    const existing = await ProductReview.findOne({ userId, groupId });
    if (existing) {
      existing.rating = sample.rating;
      existing.comment = sample.comment;
      existing.authorName = sample.authorName;
      existing.createdAt = createdAt;
      existing.updatedAt = new Date();
      await existing.save();
      updated++;
    } else {
      await ProductReview.create({
        userId,
        groupId,
        rating: sample.rating,
        comment: sample.comment,
        authorName: sample.authorName,
        createdAt,
        updatedAt: createdAt,
      });
      inserted++;
    }
  }

  const count = await ProductReview.countDocuments({ groupId });
  const agg = await ProductReview.aggregate<{ avg: number }>([
    { $match: { groupId } },
    { $group: { _id: null, avg: { $avg: '$rating' } } },
  ]);
  const avg = agg[0]?.avg != null ? Math.round(agg[0].avg * 10) / 10 : 0;

  console.log(`\n✅ Reseñas: ${inserted} nuevas, ${updated} actualizadas`);
  console.log(`⭐ Total: ${count} reseñas · Promedio: ${avg} / 5`);
  console.log(`\nAbre en el navegador: http://localhost:3000/shop/${groupId}`);

  await mongoose.connection.close();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌', err);
  await mongoose.connection.close();
  process.exit(1);
});
