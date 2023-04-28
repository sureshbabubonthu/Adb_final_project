import {
	ArrowLeftIcon,
	MinusCircleIcon,
	ShoppingCartIcon,
	TrashIcon,
} from '@heroicons/react/24/solid'
import {
	ActionIcon,
	Anchor,
	Button,
	Input,
	Modal,
	Select,
	TextInput,
} from '@mantine/core'
import {DatePicker} from '@mantine/dates'
import {cleanNotifications, showNotification} from '@mantine/notifications'
import {PaymentMethod} from '@prisma/client'
import type {ActionArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Link, useFetcher, useLocation} from '@remix-run/react'
import * as React from 'react'
import ReactInputMask from 'react-input-mask'
import {TailwindContainer} from '~/components/TailwindContainer'
import type {CartItem} from '~/context/CartContext'
import {useCart} from '~/context/CartContext'
import {createOrder} from '~/lib/order.server'
import {getUserId} from '~/lib/session.server'
import {useOptionalUser} from '~/utils/hooks'
import {titleCase} from '~/utils/misc'
import {badRequest} from '~/utils/misc.server'

type ActionData = Partial<{
	success: boolean
	message: string
}>

export async function action({request}: ActionArgs) {
	const formData = await request.formData()

	const userId = await getUserId(request)
	const intent = formData.get('intent')?.toString()

	if (!userId || !intent) {
		return json({success: false, message: 'Unauthorized'}, {status: 401})
	}

	switch (intent) {
		case 'place-order': {
			const stringifiedProducts = formData.get('products[]')?.toString()
			const amount = formData.get('amount')?.toString()
			const paymentMethod = formData.get('paymentMethod')?.toString()
			const customerName = formData.get('customerName')?.toString()
			const customerPhone = formData.get('customerPhone')?.toString()

			if (
				!stringifiedProducts ||
				!amount ||
				!paymentMethod ||
				!customerName ||
				!customerPhone
			) {
				return badRequest<ActionData>({
					success: false,
					message: 'Invalid request body',
				})
			}

			const products = JSON.parse(stringifiedProducts) as Array<CartItem>

			await createOrder({
				userId,
				products,
				customerName,
				customerPhone,
				amount: Number(amount),
				paymentMethod: paymentMethod as PaymentMethod,
			})

			return redirect('/sale-details/?success=true')
		}
	}
}

export default function Cart() {
	const id = React.useId()
	const location = useLocation()
	const fetcher = useFetcher<ActionData>()

	const {clearCart, itemsInCart, totalPrice} = useCart()
	const {user} = useOptionalUser()

	const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
		PaymentMethod.CREDIT_CARD
	)
	const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false)
	const [cardNumber, setCardNumber] = React.useState<string>('')
	const [cardExpiry, setCardExpiry] = React.useState<Date | null>(null)
	const [cardCvv, setCardCvv] = React.useState<string>('')
	const [errors, setErrors] = React.useState<{
		cardNumber?: string
		cardExpiry?: string
		cardCvv?: string
	}>({
		cardNumber: '',
		cardExpiry: '',
		cardCvv: '',
	})

	const closePaymentModal = () => setIsPaymentModalOpen(false)
	const showPaymentModal = () => setIsPaymentModalOpen(true)

	const isSubmitting = fetcher.state !== 'idle'
	const isCashPayment = paymentMethod === PaymentMethod.CASH

	React.useEffect(() => {
		if (fetcher.type !== 'done') {
			return
		}

		cleanNotifications()
		if (!fetcher.data.success) {
			showNotification({
				title: 'Error',
				message: fetcher.data.message,
				icon: <MinusCircleIcon className="h-7 w-7" />,
				color: 'red',
			})
			return
		}
	}, [fetcher.data, fetcher.type])

	return (
		<>
			<div className="flex flex-col gap-4 p-4">
				<div className="bg-[rgb(129, 135, 80)]">
					<TailwindContainer>
						<div className="sm:px-4py-16 py-16 px-4 sm:py-20">
							<div className="flex items-center justify-between">
								<div>
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
										Your cart
									</h1>
									<p className="mt-2 text-sm text-gray-500">
										Products in your cart
									</p>
								</div>

								{itemsInCart.length > 0 ? (
									<div className="space-x-2">
										<Button
											variant="subtle"
											color="red"
											onClick={() => clearCart()}
											disabled={isSubmitting}
										>
											Clear cart
										</Button>

										{user ? (
											<Button
												variant="light"
												loading={isSubmitting}
												onClick={() => showPaymentModal()}
											>
												Make payment
											</Button>
										) : (
											<Button
												variant="light"
												component={Link}
												to={`/login?redirectTo=${encodeURIComponent(
													location.pathname
												)}`}
											>
												Sign in to order
											</Button>
										)}
									</div>
								) : null}
							</div>

							<div className="mt-16">
								<h2 className="sr-only">Current ice-creams in cart</h2>

								<div className="flex flex-col gap-12">
									{itemsInCart.length > 0 ? <CartItems /> : <EmptyState />}
								</div>
							</div>
						</div>
					</TailwindContainer>
				</div>
			</div>

			<Modal
				opened={!!user && isPaymentModalOpen}
				onClose={closePaymentModal}
				title="Payment"
				centered
				overlayBlur={1}
				overlayOpacity={0.7}
			>
				<fetcher.Form
					method="post"
					className="flex flex-col gap-4"
					onSubmit={e => {
						e.preventDefault()

						const formData = new FormData(e.currentTarget)

						setErrors({
							cardNumber: '',
							cardExpiry: '',
							cardCvv: '',
						})

						if (cardNumber.replace(/[_ ]/g, '').length !== 16) {
							setErrors(prevError => ({
								...prevError,
								cardNumber: 'Card number must be 16 digits',
							}))
						}

						if (!cardExpiry) {
							setErrors(prevError => ({
								...prevError,
								cardExpiry: 'Card expiry is required',
							}))
						}

						if (!cardCvv || cardCvv.length !== 3) {
							setErrors(prevError => ({
								...prevError,
								cardCvv: 'Card CVV must be 3 digits',
							}))
						}

						if (Object.values(errors).some(error => error !== '')) {
							return
						}

						formData.append('products[]', JSON.stringify(itemsInCart))
						formData.append('amount', totalPrice.toString())
						formData.append('intent', 'place-order')
						formData.append('paymentMethod', paymentMethod)

						fetcher.submit(formData, {
							method: 'post',
							replace: true,
						})
					}}
				>
					<div className="flex flex-col gap-2">
						<h2 className="text-sm text-gray-600">
							<span className="font-semibold">Amount: </span>
							<span>${totalPrice}</span>
						</h2>
					</div>

					<TextInput name="customerName" label="Customer name" required />
					<TextInput name="customerPhone" label="Customer phone" required />

					<Select
						label="Payment method"
						value={paymentMethod}
						clearable={false}
						onChange={e => setPaymentMethod(e as PaymentMethod)}
						data={Object.values(PaymentMethod).map(method => ({
							label: titleCase(method.replace(/_/g, ' ')),
							value: method,
						}))}
					/>
					{!isCashPayment && (
						<>
							<Input.Wrapper
								id={id}
								label="Credit card number"
								required
								error={errors.cardNumber}
							>
								<Input
									id={id}
									component={ReactInputMask}
									mask="9999 9999 9999 9999"
									placeholder="XXXX XXXX XXXX XXXX"
									alwaysShowMask={false}
									value={cardNumber}
									onChange={e => setCardNumber(e.target.value)}
								/>
							</Input.Wrapper>

							<div className="flex items-center gap-4">
								<Input.Wrapper
									id={id + 'cvv'}
									label="CVV"
									required
									error={errors.cardCvv}
								>
									<Input
										id={id + 'cvv'}
										name="cvv"
										component={ReactInputMask}
										mask="999"
										placeholder="XXX"
										alwaysShowMask={false}
										value={cardCvv}
										onChange={e => setCardCvv(e.target.value)}
									/>
								</Input.Wrapper>

								<DatePicker
									name="expiryDate"
									label="Expiry"
									inputFormat="MM/YYYY"
									clearable={false}
									placeholder="MM/YYYY"
									labelFormat="MM/YYYY"
									required
									value={cardExpiry}
									minDate={new Date()}
									onChange={e => setCardExpiry(e)}
									error={errors.cardExpiry}
									initialLevel="year"
									hideOutsideDates
								/>
							</div>
						</>
					)}

					<div className="mt-6 flex items-center gap-4 sm:justify-end">
						<Button
							variant="subtle"
							color="red"
							onClick={() => closePaymentModal()}
						>
							Cancel
						</Button>

						<Button
							variant="filled"
							type="submit"
							loading={isSubmitting}
							loaderPosition="right"
						>
							Place order
						</Button>
					</div>
				</fetcher.Form>
			</Modal>
		</>
	)
}

function CartItems() {
	const {itemsInCart, removeItemFromCart, totalPrice} = useCart()

	return (
		<>
			<table className="mt-4 w-full text-gray-500 sm:mt-6">
				<thead className="sr-only text-left text-sm text-gray-500 sm:not-sr-only">
					<tr>
						<th scope="col" className="py-3 pr-8 font-normal sm:w-2/5 lg:w-1/3">
							Products
						</th>
						<th
							scope="col"
							className="hidden py-3 pr-8 font-normal sm:table-cell"
						>
							Quantity
						</th>
						<th
							scope="col"
							className="hidden py-3 pr-8 font-normal sm:table-cell"
						>
							Price
						</th>

						<th scope="col" className="w-0 py-3 text-right font-normal" />
					</tr>
				</thead>

				<tbody className="divide-y divide-gray-200 border-b border-gray-200 text-sm sm:border-t">
					{itemsInCart.map(item => {
						const itemTotalPrice = item.basePrice * item.quantity

						return (
							<tr key={item.id}>
								<td className="py-6 pr-8">
									<div className="flex items-center">
										<img
											src={item.image}
											alt={item.name}
											className="mr-6 h-16 w-16 rounded object-cover object-center"
										/>
										<div>
											<div className="flex flex-col font-medium text-gray-900">
												<Anchor
													component={Link}
													to={`/product/${item.slug}`}
													size="sm"
												>
													{item.name}
												</Anchor>
											</div>
										</div>
									</div>
								</td>

								<td className="hidden py-6 pr-8 sm:table-cell">
									{item.quantity}
								</td>
								<td className="hidden py-6 pr-8 font-semibold sm:table-cell">
									${itemTotalPrice.toFixed(2)}
								</td>
								<td className="whitespace-nowrap py-6 text-right font-medium">
									<ActionIcon onClick={() => removeItemFromCart(item.id!)}>
										<TrashIcon className="h-4 w-4 text-red-500" />
									</ActionIcon>
								</td>
							</tr>
						)
					})}

					<tr>
						<td className="py-6 pr-8">
							<div className="flex items-center">
								<div>
									<div className="font-medium text-gray-900" />
									<div className="mt-1 sm:hidden" />
								</div>
							</div>
						</td>

						<td className="hidden py-6 pr-8 sm:table-cell" />
						<td className="hidden py-6 pr-8 font-semibold sm:table-cell">
							<span>${totalPrice.toFixed(2)}</span>
						</td>
					</tr>
				</tbody>
			</table>
		</>
	)
}

function EmptyState() {
	return (
		<div className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
			<ShoppingCartIcon className="mx-auto h-9 w-9 text-gray-500" />
			<span className="mt-4 block text-sm font-medium text-gray-500">
				Your cart is empty
			</span>
		</div>
	)
}
