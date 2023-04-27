import {ArrowLeftIcon, ShoppingBagIcon} from '@heroicons/react/24/outline'
import {Anchor, Badge, Button} from '@mantine/core'
import {OrderStatus, OrderType} from '@prisma/client'
import type {ActionArgs, LoaderArgs, SerializeFrom} from '@remix-run/node'
import {json} from '@remix-run/node'
import {
	Link,
	useFetcher,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import clsx from 'clsx'
import * as React from 'react'
import {TailwindContainer} from '~/components/TailwindContainer'
import {useCart} from '~/context/CartContext'
import {getOrders, cancelOrder} from '~/lib/order.server'
import {requireUserId} from '~/lib/session.server'
import {formatTime, titleCase} from '~/utils/misc'
import {badRequest} from '~/utils/misc.server'

const dateFormatter = new Intl.DateTimeFormat('en-US')

type LoaderData = SerializeFrom<typeof loader>
export const loader = async ({request}: LoaderArgs) => {
	const userId = await requireUserId(request)
	const orders = await getOrders(userId)
	return json({orders})
}

export const action = async ({request}: ActionArgs) => {
	const userId = await requireUserId(request)
	const formData = await request.formData()

	const intent = formData.get('intent')?.toString()
	if (!userId || !intent) {
		return json({success: false, message: 'Unauthorized'}, {status: 401})
	}

	switch (intent) {
		case 'cancel-order': {
			const orderId = formData.get('orderId')?.toString()
			if (!orderId) {
				return badRequest({success: false, message: 'Invalid order id'})
			}

			return cancelOrder(orderId)
				.then(() => json({success: true}))
				.catch(e => json({success: false, message: e.message}, {status: 500}))
		}

		default:
			return json({success: false, message: 'Invalid intent'}, {status: 400})
	}
}

export default function OrderHistory() {
	const {orders} = useLoaderData<typeof loader>()

	const [searchParams, setSearchParams] = useSearchParams()
	const {clearCart} = useCart()

	React.useEffect(() => {
		const success = searchParams.get('success')
		if (success) {
			clearCart()
			setSearchParams({}, {replace: true})
			return
		}
	}, [clearCart, searchParams, setSearchParams])

	return (
		<>
			<div className="flex flex-col gap-4 p-4">
				<div className="bg-[rgb(129, 135, 80)]">
					<TailwindContainer>
						<div className="py-16 px-4 sm:py-20 sm:px-4">
							<div className="max-w-xl">
								<div className="mb-12">
									<Button
										leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
										variant="white"
										size="md"
										component={Link}
										to=".."
										pl={0}
									>
										Back
									</Button>
								</div>

								<h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
									Order history
								</h1>
								<p className="mt-2 text-sm text-gray-500">
									Check the status of recent orders.
								</p>
							</div>

							<div className="mt-16">
								<h2 className="sr-only">Recent orders</h2>

								<div className="flex flex-col gap-20">
									{orders.length > 0 ? (
										<>
											{orders.map(order => (
												<Order order={order} key={order.id} />
											))}
										</>
									) : (
										<EmptyState />
									)}
								</div>
							</div>
						</div>
					</TailwindContainer>
				</div>
			</div>
		</>
	)
}

function Order({order}: {order: LoaderData['orders'][number]}) {
	const returnOrderFetcher = useFetcher()

	const isOrderCancelled = order.status === OrderStatus.CANCELLED
	const isDelivery = order.type === OrderType.DELIVERY

	return (
		<div key={order.id}>
			<h3 className="sr-only">
				Order placed on{' '}
				<time dateTime={order.createdAt}>{order.createdAt}</time>
			</h3>

			<div
				className={clsx(
					'rounded-lg bg-gray-50 py-6 px-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:gap-8'
				)}
			>
				<dl className="flex-auto space-y-6 divide-y divide-gray-200 text-sm text-gray-600  sm:flex sm:items-center sm:gap-6 sm:space-y-0 sm:divide-y-0 lg:flex-none lg:gap-16">
					{/* Date placed */}
					<div className="flex justify-between sm:block">
						<dt className="font-semibold text-gray-900">Date placed</dt>
						<dd className="sm:mt-1">
							<time dateTime={order.createdAt}>
								{dateFormatter.format(new Date(order.createdAt))}
							</time>
						</dd>
					</div>

					{/* Order type */}
					<div className="flex justify-between pt-6 text-gray-900 sm:block sm:pt-0">
						<dt className="font-semibold">Order type</dt>
						<dd className="sm:mt-1">{titleCase(order.type)}</dd>
					</div>

					{/* Payment method */}
					<div className="flex justify-between pt-6 text-gray-900 sm:block sm:pt-0">
						<dt className="font-semibold">Payment method</dt>
						<dd className="sm:mt-1">
							{titleCase(order.payment!.paymentMethod.replace(/_/g, ' '))}
						</dd>
					</div>

					{/* Total amount */}
					<div className="flex justify-between pt-6  text-gray-900 sm:block sm:pt-0">
						<dt className="font-semibold">Total amount</dt>
						<dd className="flex items-center gap-2 sm:mt-1">
							<span className="font-semibold">${order.payment?.amount}</span>
						</dd>
					</div>

					{/* Status */}
					<div className="flex justify-between pt-6  text-gray-900 sm:block sm:pt-0">
						<dt className="font-semibold">Status</dt>
						<dd className="flex items-center gap-2 sm:mt-1">
							<Badge color={isOrderCancelled ? 'blue' : 'green'}>
								{titleCase(order.status)}
							</Badge>
						</dd>
					</div>
				</dl>

				{order.status === OrderStatus.DELIVERED ||
				order.status === OrderStatus.READY ||
				order.status === OrderStatus.COMPLETED ? (
					<Button
						color="red"
						variant="outline"
						loaderPosition="right"
						loading={returnOrderFetcher.state !== 'idle'}
						onClick={() =>
							returnOrderFetcher.submit(
								{
									intent: 'cancel-order',
									orderId: order.id,
								},
								{
									method: 'post',
									replace: true,
								}
							)
						}
					>
						Cancel Order
					</Button>
				) : null}
			</div>

			{/* Delivery address  */}
			{isDelivery ? (
				<div>
					<div className="mt-2 flex items-center gap-4 pt-6 text-sm text-gray-900 sm:block sm:pt-0">
						<span className="pl-6 font-semibold">Delivery address: </span>
						<span className="font-normal">{order.payment?.address}</span>
					</div>
					{order.status === OrderStatus.PREPARING ? (
						<div className="mt-2 flex items-center gap-4 pt-6 text-sm text-gray-900 sm:block sm:pt-0">
							<span className="pl-6 font-semibold">Estd time: </span>
							<span className="font-normal">45min</span>
						</div>
					) : null}
				</div>
			) : order.status === OrderStatus.READY ? (
				<div className="mt-2 flex items-center gap-4 pt-6 text-sm text-gray-900 sm:block sm:pt-0">
					<span className="pl-6 font-semibold">Pickup Time: </span>
					<span className="font-normal">{formatTime(order.pickupTime!)}</span>
				</div>
			) : null}

			<table className="mt-4 w-full text-gray-500 sm:mt-6">
				<thead className="sr-only text-left text-sm text-gray-500 sm:not-sr-only">
					<tr>
						<th scope="col" className="py-3 pr-8 font-normal sm:w-2/5 lg:w-1/3">
							Product
						</th>
						<th
							scope="col"
							className="hidden w-1/5 py-3 pr-8 font-normal sm:table-cell"
						>
							Quantity
						</th>
						<th
							scope="col"
							className="hidden py-3 pr-8 font-normal sm:table-cell"
						>
							Price
						</th>
						<th scope="col" className="w-0 py-3 text-right font-normal"></th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-200 border-b border-gray-200 text-sm sm:border-t">
					{order.products.map(product => (
						<tr key={product.id}>
							<td className="py-6 pr-8">
								<div className="flex items-center">
									<img
										src={product.product.image}
										alt={product.product.name}
										className="mr-6 h-16 w-16 rounded object-cover object-center"
									/>
									<div className="flex flex-col font-medium text-gray-900">
										<Anchor
											component={Link}
											to={`/product/${product.product.slug}`}
											size="sm"
										>
											{product.product.name}
										</Anchor>
									</div>
								</div>
							</td>

							<td className="hidden py-6 pr-8 sm:table-cell">
								{product.quantity}
							</td>

							<td className="hidden py-6 pr-8 sm:table-cell">
								${product.amount}
							</td>

							<td className="whitespace-nowrap py-6 text-right font-medium">
								<Anchor
									component={Link}
									to={`/product/${product.product.slug}`}
									size="sm"
								>
									View
									<span className="sr-only">, {product.product.name}</span>
								</Anchor>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

function EmptyState() {
	return (
		<div className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
			<ShoppingBagIcon className="mx-auto h-9 w-9 text-gray-500" />
			<span className="mt-4 block text-sm font-medium text-gray-500">
				No previous orders
			</span>
		</div>
	)
}
