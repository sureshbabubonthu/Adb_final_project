import type {Order, Payment, PaymentMethod, User} from '@prisma/client'
import {OrderStatus} from '@prisma/client'
import type {CartItem} from '~/context/CartContext'
import {db} from './prisma.server'

export function getAllOrders() {
	return db.order.findMany({
		orderBy: {createdAt: 'desc'},
		include: {
			user: true,
			payment: true,
			products: {
				include: {
					product: true,
				},
			},
		},
	})
}

export function getOrders(userId: User['id']) {
	return db.order.findMany({
		where: {
			userId,
		},
		orderBy: {
			createdAt: 'desc',
		},
		include: {
			products: {
				include: {
					product: true,
				},
			},
			payment: true,
		},
	})
}

export function createOrder({
	userId,
	products,
	amount,
	customerName,
	customerPhone,
	paymentMethod,
}: {
	userId: User['id']
	products: Array<CartItem>
	amount: Payment['amount']
	customerName: Order['customerName']
	customerPhone: Order['customerPhone']
	paymentMethod: PaymentMethod
}) {
	return db.$transaction(async tx => {
		const order = await tx.order.create({
			data: {
				userId,
				status: OrderStatus.READY,
				customerName,
				customerPhone,
				payment: {
					create: {
						paymentMethod,
						amount,
						user: {
							connect: {
								id: userId,
							},
						},
					},
				},
			},
		})

		await tx.productOrder.createMany({
			data: products.map(p => ({
				productId: p.id,
				orderId: order.id,
				quantity: p.quantity,
				amount: p.basePrice * p.quantity,
			})),
		})

		await Promise.all(
			products.map(async p => {
				const product = await tx.product.update({
					where: {
						id: p.id,
					},
					data: {
						quantity: {
							decrement: p.quantity,
						},
					},
				})

				if (product.quantity < 0) {
					throw new Error(`Product ${product.name} has insufficient quantity`)
				}
			})
		)

		return order
	})
}

export async function cancelOrder(orderId: Order['id']) {
	const order = await db.order.findUnique({
		where: {
			id: orderId,
		},
		include: {
			products: {
				include: {
					product: true,
				},
			},
		},
	})

	if (!order) {
		throw new Error('Order not found')
	}

	await db.order.update({
		where: {
			id: orderId,
		},
		data: {
			status: OrderStatus.CANCELLED,
		},
	})

	const products = order.products.map(p => ({
		id: p.product.id,
		quantity: p.quantity,
		baseQuantity: p.product.quantity,
	}))

	await Promise.all(
		products.map(p =>
			db.product.update({
				where: {
					id: p.id,
				},
				data: {
					quantity: {
						increment: p.quantity,
					},
				},
			})
		)
	)
}
