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
				status: OrderStatus.DONE,
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
			payment: true,

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
			status: OrderStatus.RETURN,
		},
	})

	const products = order.products.map(p => ({
		isReturnable: p.product.isReturnable,
		price: p.amount,
		quantity: p.quantity,
		id: p.productId,
	}))
	const totalAmount = order.payment?.amount ?? 0

	let newAmountAfterReturns = totalAmount
	await Promise.all(
		products.map(async p => {
			if (!p.isReturnable) {
				return Promise.resolve()
			}

			newAmountAfterReturns -= p.price

			await db.productOrder.update({
				where: {
					productId_orderId: {
						productId: p.id,
						orderId: orderId,
					},
				},
				data: {
					quantity: {
						set: 0,
					},
					amount: {
						set: 0,
					},
					status: OrderStatus.RETURN,
				},
			})

			return db.product.update({
				where: {
					id: p.id,
				},
				data: {
					quantity: {
						increment: p.quantity,
					},
				},
			})
		})
	)

	await db.payment.update({
		where: {
			orderId,
		},
		data: {
			amount: newAmountAfterReturns,
		},
	})
}
