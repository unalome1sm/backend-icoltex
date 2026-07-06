import { ProductReview } from '../models/ProductReview';

export type ProductReviewRow = {
  id: string;
  userId: string;
  groupId: string;
  rating: number;
  comment: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductReviewsSummary = {
  count: number;
  averageRating: number | null;
};

function toRow(doc: {
  _id: { toString(): string };
  userId: { toString(): string };
  groupId: string;
  rating: number;
  comment: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
}): ProductReviewRow {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    groupId: doc.groupId,
    rating: doc.rating,
    comment: doc.comment,
    authorName: doc.authorName,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function computeSummary(groupId: string): Promise<ProductReviewsSummary> {
  const agg = await ProductReview.aggregate<{ count: number; avg: number | null }>([
    { $match: { groupId } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avg: { $avg: '$rating' },
      },
    },
  ]);
  const row = agg[0];
  if (!row) {
    return { count: 0, averageRating: null };
  }
  return {
    count: row.count,
    averageRating: row.avg != null ? Math.round(row.avg * 10) / 10 : null,
  };
}

export async function listProductReviews(
  groupId: string,
  page: number,
  limit: number,
  currentUserId?: string
): Promise<{
  reviews: ProductReviewRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: ProductReviewsSummary;
  myReview: ProductReviewRow | null;
}> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const [total, docs, summary, mine] = await Promise.all([
    ProductReview.countDocuments({ groupId }),
    ProductReview.find({ groupId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    computeSummary(groupId),
    currentUserId
      ? ProductReview.findOne({ groupId, userId: currentUserId }).lean()
      : Promise.resolve(null),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    reviews: docs.map((d) =>
      toRow({
        _id: d._id,
        userId: d.userId as { toString(): string },
        groupId: d.groupId,
        rating: d.rating,
        comment: d.comment,
        authorName: d.authorName,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })
    ),
    pagination: { page: safePage, limit: safeLimit, total, totalPages },
    summary,
    myReview: mine
      ? toRow({
          _id: mine._id,
          userId: mine.userId as { toString(): string },
          groupId: mine.groupId,
          rating: mine.rating,
          comment: mine.comment,
          authorName: mine.authorName,
          createdAt: mine.createdAt,
          updatedAt: mine.updatedAt,
        })
      : null,
  };
}

export async function upsertProductReview(
  userId: string,
  groupId: string,
  input: { rating: number; comment: string; authorName: string }
): Promise<ProductReviewRow> {
  const doc = await ProductReview.findOneAndUpdate(
    { userId, groupId },
    {
      $set: {
        rating: input.rating,
        comment: input.comment,
        authorName: input.authorName,
      },
      $setOnInsert: { userId, groupId },
    },
    { new: true, upsert: true, runValidators: true }
  );

  return toRow({
    _id: doc._id,
    userId: doc.userId as { toString(): string },
    groupId: doc.groupId,
    rating: doc.rating,
    comment: doc.comment,
    authorName: doc.authorName,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}

export function displayAuthorName(nombre?: string, email?: string): string {
  if (nombre?.trim()) return nombre.trim();
  if (email?.trim()) {
    const local = email.split('@')[0];
    return local || 'Cliente';
  }
  return 'Cliente';
}
