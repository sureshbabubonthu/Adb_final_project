import {Anchor, Button, MultiSelect} from '@mantine/core'
import {Link} from '@remix-run/react'
import * as React from 'react'
import {TailwindContainer} from '~/components/TailwindContainer'
import {useAppData} from '~/utils/hooks'

export default function Dashboard() {
	const {products, categories} = useAppData()

	const [filteredProducts, setFilteredProducts] = React.useState(products)
	const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
		[]
	)

	React.useEffect(() => {
		if (!selectedCategories || selectedCategories.length === 0) {
			setFilteredProducts(products)
			return
		}

		setFilteredProducts(
			products.filter(product =>
				product.category.some(category => selectedCategories.includes(category))
			)
		)
	}, [products, selectedCategories])

	return (
		<div className="flex flex-col gap-4 p-4">
			<div className="bg-[rgb(129, 135, 80)]">
				<TailwindContainer>
					<div className="py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
						<div className="flex items-center justify-between">
							<h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
								Products
							</h2>

							<MultiSelect
								clearable
								value={selectedCategories}
								onChange={setSelectedCategories}
								label="Filter by category"
								placeholder="Select category"
								data={categories.map(c => ({
									label: c,
									value: c,
								}))}
							/>
						</div>

						<div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
							{filteredProducts.map(product => {
								return (
									<div key={product.id} className="mx-auto sm:mx-[unset]">
										<div className="h-48 overflow-hidden rounded-md bg-gray-200 shadow lg:h-64">
											<img
												src={product.image}
												alt={product.name}
												className="h-full w-full object-cover object-center"
											/>
										</div>

										<h3 className="mt-4 text-sm text-gray-700">
											<Anchor
												to={`/product/${product.slug}`}
												prefetch="intent"
												component={Link}
											>
												{product.name}
											</Anchor>
										</h3>

										<p className="mt-1 text-sm font-medium text-gray-900">
											${product.price}
										</p>

										<Button
											to={`/product/${product.slug}`}
											component={Link}
											variant="light"
											fullWidth
											mt="md"
										>
											View
										</Button>
									</div>
								)
							})}
						</div>
					</div>
				</TailwindContainer>
			</div>
		</div>
	)
}
