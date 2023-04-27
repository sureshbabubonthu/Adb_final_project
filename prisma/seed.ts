import {PrismaClient, Role} from '@prisma/client'
import slugify from 'slugify'
import {createPasswordHash} from '~/utils/misc.server'

const db = new PrismaClient()

async function seed() {
	await db.user.deleteMany()
	await db.product.deleteMany()
	await db.productOrder.deleteMany()
	await db.order.deleteMany()

	await db.user.create({
		data: {
			name: 'John Doe',
			email: 'user@app.com',
			password: await createPasswordHash('password'),
			role: Role.CUSTOMER,
			address: '123 Main St',
		},
	})

	await db.user.create({
		data: {
			name: 'Roxanna',
			email: 'admin@app.com',
			password: await createPasswordHash('password'),
			role: Role.ADMIN,
		},
	})

	for (const product of products) {
		await db.product.create({
			data: {
				name: product.name,
				description: product.description,
				price: product.price,
				image: product.image,
				slug: slugify(product.name, {lower: true}),
				quantity: product.quantity,
				category: {
					set: product.category,
				},
			},
		})
	}

	console.log(`Database has been seeded. 🌱`)
}

seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await db.$disconnect()
	})

const products = [
	{
		name: 'Brinjals (300gm)',
		description:
			'Brinjal is a tropical and subtropical plant that prefers a warm and humid climate. It is a tender perennial, grown as an annual vegetable crop in temperate climates. The plant is erect, with a single stem that grows to a height of 1-3 m (3-10 ft).',
		image:
			'https://images.unsplash.com/photo-1617692913859-e492ea72afb7?auto=format&fit=crop&w=1170&q=80',
		quantity: 10,
		price: 11.99,
		category: ['Vegetables'],
	},
	{
		name: 'Cabbage (500gm)',
		description:
			'Cabbage is a leafy green, red, or white biennial plant, grown as an annual vegetable crop for its dense-leaved heads. It is descended from the wild cabbage, B. oleracea, and belongs to the same species as broccoli and cauliflower.',
		image:
			'https://images.unsplash.com/photo-1598030343246-eec71cb44231?auto=format&fit=crop&w=1074&q=80',
		quantity: 10,
		price: 7.99,
		category: ['Vegetables'],
	},
]
