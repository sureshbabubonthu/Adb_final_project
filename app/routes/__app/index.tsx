import {
	MagnifyingGlassIcon,
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
	NumberInput,
	Select,
	TextInput,
} from '@mantine/core'
import {DatePicker} from '@mantine/dates'
import {useDisclosure} from '@mantine/hooks'
import {cleanNotifications, showNotification} from '@mantine/notifications'
import {PaymentMethod} from '@prisma/client'
import type {ActionArgs} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {Link, useFetcher, useNavigate} from '@remix-run/react'
import * as React from 'react'
import ReactInputMask from 'react-input-mask'
import type {CartItem} from '~/context/CartContext'
import {useCart} from '~/context/CartContext'
import {createOrder} from '~/lib/order.server'
import {getUserId} from '~/lib/session.server'
import {useAppData} from '~/utils/hooks'
import {formatDateTime, titleCase} from '~/utils/misc'
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
			const tax = formData.get('tax')?.toString()
			const paymentMethod = formData.get('paymentMethod')?.toString()
			const customerName = formData.get('customerName')?.toString()
			const customerPhone = formData.get('customerPhone')?.toString()

			if (
				!stringifiedProducts ||
				!amount ||
				!paymentMethod ||
				!customerName ||
				!customerPhone ||
				!tax
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
				tax: Number(tax),
				customerName,
				customerPhone,
				amount: Number(amount),
				paymentMethod: paymentMethod as PaymentMethod,
			})

			return redirect('/sale-details/?success=true')
		}
	}
}

export default function Dashboard() {
	const {products} = useAppData()
	const navigate = useNavigate()
	const [isSearchModalOpen, handleOpenSearchModal] = useDisclosure(false, {
		onClose: () => {
			setQuery('')
			setError('')
		},
	})
	const [query, setQuery] = React.useState('')
	const [error, setError] = React.useState('')

	const {clearCart, itemsInCart, totalPrice, tax} = useCart()

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
	const id = React.useId()
	const fetcher = useFetcher<ActionData>()
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
		<div className="flex h-[80vh] flex-col gap-4 overflow-hidden p-4">
			<div className="flex w-full items-center justify-between border-b border-b-gray-500 pb-4">
				<div className="flex items-center gap-4">
					<Button
						variant="filled"
						color="white"
						onClick={() => handleOpenSearchModal.open()}
					>
						<MagnifyingGlassIcon className="mr-2 h-4 w-4" aria-hidden="true" />
						<p>Search via barcode</p>
					</Button>
					<Button variant="outline" component={Link} to="/items">
						View all items
					</Button>
				</div>

				<div>
					<p className="text-sm">{formatDateTime(new Date())}</p>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				<div className="flex flex-col gap-12">
					{itemsInCart.length > 0 ? <CartItems /> : <EmptyState />}
				</div>
			</div>

			<div className="border-t border-t-gray-500 p-4">
				{itemsInCart.length > 0 ? (
					<div className="flex items-center justify-between">
						<div className="space-x-2">
							<Button
								variant="filled"
								loading={isSubmitting}
								onClick={() => showPaymentModal()}
							>
								Pay Now
							</Button>
							<Button
								variant="outline"
								color="red"
								onClick={() => clearCart()}
								disabled={isSubmitting}
							>
								Clear items
							</Button>
						</div>

						<div className="flex flex-col gap-2">
							<p>Tax: ${tax.toFixed(2)}</p>
							<p>Total: ${totalPrice.toFixed(2)}</p>
						</div>
					</div>
				) : null}
			</div>

			<Modal
				opened={isSearchModalOpen}
				onClose={handleOpenSearchModal.close}
				title="Search for a product"
				centered
				overlayBlur={15}
				overlayOpacity={0.5}
			>
				<div className="flex flex-col gap-4">
					<TextInput
						label="Enter barcode Id"
						name="barcodeId"
						value={query}
						onChange={event => setQuery(event.currentTarget.value)}
						required
						autoFocus
					/>

					{error && (
						<div className="text-sm font-medium text-red-500">{error}</div>
					)}

					<Button
						type="submit"
						variant="filled"
						fullWidth
						onClick={() => {
							const product = products.find(
								product => product.barcodeId === query
							)

							if (!product) {
								setError('Product not found')
								return
							}

							navigate(`/product/${product.slug}`)
						}}
					>
						Search
					</Button>
				</div>
			</Modal>

			<Modal
				opened={isPaymentModalOpen}
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
						formData.append('tax', tax.toString())
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
							<span>${totalPrice.toFixed(2)}</span>
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
		</div>
	)
}

function CartItems() {
	const {itemsInCart} = useCart()

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
					{itemsInCart.map(item => (
						<ItemRow item={item} key={item.id} />
					))}
				</tbody>
			</table>
		</>
	)
}

function EmptyState() {
	return (
		<div className="relative block h-full w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
			<ShoppingCartIcon className="mx-auto h-9 w-9 text-gray-500" />
			<span className="mt-4 block text-sm font-medium text-gray-500">
				Add items to your customers card and they will appear here
			</span>
		</div>
	)
}

function ItemRow({item}: {item: CartItem}) {
	const {removeItemFromCart, updateQuantity} = useCart()

	const itemTotalPrice = item.basePrice * item.quantity

	const [quantity, setQuantity] = React.useState<number | undefined>(
		item.quantity
	)

	React.useEffect(() => {
		if (quantity !== undefined) {
			updateQuantity(item.id, quantity)
		}
	}, [item.id, quantity, updateQuantity])

	return (
		<tr key={item.id}>
			<td className="py-3 pr-8">
				<div className="flex items-center">
					<img
						src={item.image}
						alt={item.name}
						className="mr-6 h-10 w-10 rounded object-cover object-center"
					/>
					<div>
						<div className="flex flex-col font-medium text-gray-900">
							<Anchor component={Link} to={`/product/${item.slug}`} size="sm">
								{item.name}
							</Anchor>
						</div>
					</div>
				</div>
			</td>

			<td className="hidden py-6 pr-8 sm:table-cell">
				<NumberInput value={quantity} onChange={setQuantity} min={1} w={80} />
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
}
