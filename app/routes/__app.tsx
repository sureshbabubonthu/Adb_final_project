import {ShoppingBagIcon, ShoppingCartIcon} from '@heroicons/react/24/outline'
import {
	ArrowLeftOnRectangleIcon,
	ArrowRightOnRectangleIcon,
	MagnifyingGlassIcon,
	UserPlusIcon,
} from '@heroicons/react/24/solid'
import {
	ActionIcon,
	Anchor,
	Avatar,
	Button,
	Divider,
	Group,
	Indicator,
	Menu,
	ScrollArea,
	Text,
} from '@mantine/core'
import type {SpotlightAction} from '@mantine/spotlight'
import {SpotlightProvider, useSpotlight} from '@mantine/spotlight'
import type {LoaderArgs, SerializeFrom} from '@remix-run/node'
import {json, redirect} from '@remix-run/node'
import {
	Form,
	Link,
	Outlet,
	useLoaderData,
	useLocation,
	useNavigate,
} from '@remix-run/react'
import appConfig from 'app.config'
import * as React from 'react'
import {Footer} from '~/components/Footer'
import {TailwindContainer} from '~/components/TailwindContainer'
import {useCart} from '~/context/CartContext'
import {getAllProducts} from '~/lib/product.server'
import {isAdmin, isCustomer} from '~/lib/session.server'
import {useOptionalUser} from '~/utils/hooks'

export type AppLoaderData = SerializeFrom<typeof loader>
export const loader = async ({request}: LoaderArgs) => {
	if (await isAdmin(request)) {
		return redirect('/admin')
	}

	const products = await getAllProducts()
	// geat all the unique categories
	const categories = Array.from(
		new Set(products.map(product => product.category).flat())
	)

	return json({
		products,
		categories,
		isCustomer: await isCustomer(request),
	})
}

export default function AppLayout() {
	const navigate = useNavigate()
	const {products} = useLoaderData<typeof loader>()

	const [actions] = React.useState<SpotlightAction[]>(() => {
		const actions = [] as SpotlightAction[]

		products.forEach(product => {
			actions.push({
				title: product.name,
				category: product.category.join(', '),
				icon: <Avatar src={product.image} radius="xl" size="sm" />,
				onTrigger: () => navigate(`/product/${product.slug}`),
			})
		})

		return actions
	})

	return (
		<>
			<SpotlightProvider
				shortcut={['mod + K', '/']}
				highlightQuery
				searchPlaceholder="Search for products..."
				searchIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
				limit={5}
				actionsWrapperComponent={ActionsWrapper}
				nothingFoundMessage={<Text>Nothing found</Text>}
				filter={(query, actions) =>
					actions.filter(
						action =>
							action.title.toLowerCase().includes(query.toLowerCase()) ||
							action.category.toLowerCase().includes(query.toLowerCase())
					)
				}
				actions={actions}
			>
				<div className="flex h-full flex-col">
					<HeaderComponent />
					<ScrollArea classNames={{root: 'flex-1'}}>
						<main>
							<Outlet />
						</main>
					</ScrollArea>
					<Footer />
				</div>
			</SpotlightProvider>
		</>
	)
}

function HeaderComponent() {
	const spotlight = useSpotlight()
	const location = useLocation()
	const {user} = useOptionalUser()
	const {itemsInCart} = useCart()
	const {isCustomer} = useLoaderData<typeof loader>()

	return (
		<>
			<Form replace action="/api/auth/logout" method="post" id="logout-form" />
			<header className="h-[100px] p-4">
				<TailwindContainer>
					<div className="flex h-full w-full items-center justify-between">
						<div className="flex flex-shrink-0 items-center gap-4">
							<Anchor component={Link} to="/">
								<img
									className="h-20 object-cover object-center"
									src={appConfig.logo}
									alt="Logo"
								/>
							</Anchor>
						</div>

						<div className="flex items-center gap-4">
							<ActionIcon
								title="Search"
								size="md"
								onClick={() => spotlight.openSpotlight()}
							>
								<MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
							</ActionIcon>

							<Indicator
								label={itemsInCart.length}
								inline
								size={16}
								disabled={itemsInCart.length <= 0}
								color="red"
								offset={7}
							>
								<Button
									px={8}
									component={Link}
									variant="subtle"
									to="/cart"
									title="Cart"
									color="gray"
								>
									<ShoppingCartIcon className="h-5 w-5 text-gray-500" />
								</Button>
							</Indicator>

							<Menu
								position="bottom-start"
								withArrow
								transition="pop-top-right"
							>
								<Menu.Target>
									<button>
										{user ? (
											<Avatar color="blue" size="md">
												{user.name.charAt(0)}
											</Avatar>
										) : (
											<Avatar />
										)}
									</button>
								</Menu.Target>

								<Menu.Dropdown>
									{user ? (
										<>
											<Menu.Item disabled>
												<div className="flex flex-col">
													<p>{user.name}</p>
													<p className="mt-0.5 text-sm">{user.email}</p>
												</div>
											</Menu.Item>
											<Divider />

											{isCustomer ? (
												<Menu.Item
													icon={<ShoppingBagIcon className="h-4 w-4" />}
													component={Link}
													to="/order-history"
												>
													Your orders
												</Menu.Item>
											) : null}
											<Menu.Item
												icon={<ArrowLeftOnRectangleIcon className="h-4 w-4" />}
												type="submit"
												form="logout-form"
											>
												Logout
											</Menu.Item>
										</>
									) : (
										<>
											<Menu.Item
												icon={<ArrowRightOnRectangleIcon className="h-4 w-4" />}
												component={Link}
												to={`/login?redirectTo=${encodeURIComponent(
													location.pathname
												)}`}
											>
												Login
											</Menu.Item>
											<Menu.Item
												icon={<UserPlusIcon className="h-4 w-4" />}
												component={Link}
												to={`/register?redirectTo=${encodeURIComponent(
													location.pathname
												)}`}
											>
												Create account
											</Menu.Item>
										</>
									)}
								</Menu.Dropdown>
							</Menu>
						</div>
					</div>
				</TailwindContainer>
			</header>
		</>
	)
}

function ActionsWrapper({children}: {children: React.ReactNode}) {
	return (
		<div>
			{children}
			<Group
				position="right"
				px={15}
				py="xs"
				className="border-t border-gray-300"
			>
				<Text size="xs" color="dimmed">
					Search powered by {appConfig.name}
				</Text>
			</Group>
		</div>
	)
}
