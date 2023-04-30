import {CheckCircleIcon, MinusCircleIcon} from '@heroicons/react/24/solid'
import {cleanNotifications, showNotification} from '@mantine/notifications'
import type {Product} from '@prisma/client'
import appConfig from 'app.config'
import * as React from 'react'
import {useLocalStorageState} from '~/utils/hooks'
import type {DateToString} from '~/utils/types'

const LocalStorageKey = 'ekart-application'

export type CartItem = DateToString<Product> & {
	basePrice: number
}

interface ICartContext {
	itemsInCart: Array<CartItem>
	addItemToCart: (item: CartItem) => void
	removeItemFromCart: (itemId: CartItem['id']) => void
	clearCart: () => void
	totalPrice: number
	tax: number
	updateQuantity: (itemId: CartItem['id'], quantity: number) => void
}

const CartContext = React.createContext<ICartContext | undefined>(undefined)

export function CartProvider({children}: {children: React.ReactNode}) {
	const [items, setItems] = useLocalStorageState<CartItem[]>({
		key: LocalStorageKey,
		defaultValue: [],
	})

	const priceBeforeTax = items.reduce(
		(acc, item) => acc + item.basePrice * item.quantity,
		0
	)
	const tax = priceBeforeTax * appConfig.TAX_PERCENTAGE
	const totalPrice = priceBeforeTax + tax

	const clearCart = React.useCallback(() => {
		cleanNotifications()
		setItems([])
		showNotification({
			title: 'Successfully cleared',
			message: 'All items in the cart are cleared',
			icon: <CheckCircleIcon className="h-7 w-7" />,
			color: 'green',
		})
	}, [setItems])

	const addItemToCart = React.useCallback(
		(item: CartItem) => {
			const isAlreadyInCart = items.some(i => i.id === item.id)

			cleanNotifications()

			if (!isAlreadyInCart) {
				setItems(prev => [
					...prev,
					{
						...item,
						quantity: item.quantity,
					},
				])

				return showNotification({
					title: 'Successfully added',
					message: `Added ${item.name} to cart`,
					color: 'green',
					icon: <CheckCircleIcon className="h-9 w-9" />,
				})
			}

			setItems(prevItems => {
				const newItems = [...prevItems]

				const index = newItems.findIndex(i => i.id === item.id)
				if (index > -1) {
					newItems[index].quantity = newItems[index].quantity + item.quantity
				}

				return newItems
			})

			showNotification({
				title: 'Item already present in cart',
				message: `Quantity increased by ${item.quantity}`,
				icon: <CheckCircleIcon className="h-7 w-7" />,
				color: 'green',
			})
		},
		[items, setItems]
	)

	const removeItemFromCart = (itemId: CartItem['id']) => {
		setItems(prev => prev.filter(item => item.id !== itemId))

		showNotification({
			title: 'Successfully removed',
			message: 'Item removed from cart',
			icon: <MinusCircleIcon className="h-7 w-7" />,
			color: 'red',
		})
	}

	const updateQuantity = React.useCallback(
		(itemId: CartItem['id'], quantity: number) => {
			setItems(prev => {
				const newItems = [...prev]

				const index = newItems.findIndex(i => i.id === itemId)
				if (index > -1) {
					newItems[index].quantity = quantity
				}

				return newItems
			})
		},
		[setItems]
	)

	return (
		<CartContext.Provider
			value={{
				itemsInCart: items,
				totalPrice,
				addItemToCart,
				removeItemFromCart,
				clearCart,
				tax,
				updateQuantity,
			}}
		>
			{children}
		</CartContext.Provider>
	)
}

export function useCart() {
	const context = React.useContext(CartContext)
	if (!context) {
		throw new Error('`useCart()` must be used within a <CartProvider />')
	}

	return context
}
