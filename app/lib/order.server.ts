import type {
	Order,
	Payment,
	PaymentMethod,
	User,
	OrderType,
} from '@prisma/client'
import {OrderStatus} from '@prisma/client'
import appConfig from 'app.config'
import {Queue} from 'quirrel/remix'
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
	orderType,
	paymentMethod,
	address,
	pickupTime,
}: {
	userId: User['id']
	products: Array<CartItem>
	amount: Payment['amount']
	paymentMethod: PaymentMethod
	orderType: OrderType
	address: Required<Payment['address']>
	pickupTime: Order['pickupTime']
}) {
	return db.$transaction(async tx => {
		const order = await tx.order.create({
			data: {
				userId,
				type: orderType,
				status: OrderStatus.PREPARING,
				pickupTime,
				payment: {
					create: {
						paymentMethod,
						address,
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

		await updateOrderStatus.enqueue(
			{
				orderId: order.id,
				status: OrderStatus.PREPARING,
			},
			{
				delay: appConfig.statusUpdateInterval,
			}
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

export const updateOrderStatus = Queue(
	'/api/queues/update-order-status',
	async ({orderId, status}: {orderId: Order['id']; status: OrderStatus}) => {
		// if (!appConfig.updateStatusAutomatically) {
		// 	return
		// }
		// await db.$transaction(async tx => {
		// 	const order = await tx.order.findUnique({
		// 		where: {
		// 			id: orderId,
		// 		},
		// 	})
		// 	invariant(order, 'Order not found')
		// 	if (order.status !== OrderStatus.PENDING) return
		// 	await db.order.update({
		// 		where: {id: orderId},
		// 		data: {status},
		// 	})
		// })
	}
)
