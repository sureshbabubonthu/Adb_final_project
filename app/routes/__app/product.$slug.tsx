import {ArrowLeftIcon} from '@heroicons/react/24/solid'
import {Button, NumberInput} from '@mantine/core'
import type {LoaderArgs} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Link, useLoaderData} from '@remix-run/react'
import * as React from 'react'
import {useCart} from '~/context/CartContext'
import {useProduct} from '~/utils/hooks'

export const loader = async ({params}: LoaderArgs) => {
	const {slug} = params

	if (!slug) {
		throw new Response('No slug provided', {status: 404})
	}

	return json({slug})
}

export default function Item() {
	const {slug} = useLoaderData<typeof loader>()
	const product = useProduct(slug)
	const {addItemToCart} = useCart()

	const [quantity, setQuantity] = React.useState(1)

	// This scenario is unlikely
	// as the slug is checked in the loader
	if (!product) {
		return null
	}

	const isOutOfStock = product.quantity === 0
	const totalPrice = quantity ? product.price * quantity : product.price

	return (
		<>
			<div className="flex flex-col gap-4 p-4">
				<div className="bg-[rgb(129, 135, 80)]">
					<div className="mx-auto max-w-2xl py-16 px-4 sm:py-24 sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-2 lg:gap-x-12 lg:px-8">
						<div className="sm:mt-10 lg:row-span-2 lg:mt-0 lg:self-center">
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
							<div className="overflow-hidden rounded-lg shadow">
								<img
									src={product.image}
									alt={product.name}
									className="aspect-square w-full object-cover"
								/>
							</div>
						</div>

						<div className="lg:col-start-2 lg:max-w-lg lg:self-end">
							<div className="mt-4">
								<h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
									{product.name}
								</h1>
							</div>

							<section aria-labelledby="information-heading" className="mt-4">
								<p className="text-lg text-gray-900 sm:text-xl">
									${totalPrice}
								</p>

								<div className="mt-4 space-y-6">
									<p className="text-base text-gray-500">
										{product.description}
									</p>
								</div>

								{!isOutOfStock ? (
									<>
										<div className="mt-4 space-y-6">
											<span>Available Quantity: </span>
											<span className="text-base text-gray-500">
												{product.quantity}
											</span>
										</div>

										<div className="mt-1 space-y-6">
											<span>Barcode ID: </span>
											<span className="text-base text-gray-500">
												{product.barcodeId}
											</span>
										</div>

										<NumberInput
											mt={12}
											required
											label="Quantity"
											value={quantity}
											max={product.quantity}
											onChange={val => setQuantity(Number(val))}
											min={1}
											defaultValue={1}
										/>
									</>
								) : null}
							</section>
						</div>

						{/* Add to cart button */}
						<div className="mt-6 lg:col-start-2 lg:row-start-2 lg:max-w-lg lg:self-start">
							<Button
								fullWidth
								mt="2.5rem"
								disabled={
									!quantity || isOutOfStock || quantity > product.quantity
								}
								onClick={() =>
									addItemToCart({
										...product,
										quantity,
										basePrice: product.price,
									})
								}
							>
								{isOutOfStock ? 'Out of stock' : 'Add to cart'}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
