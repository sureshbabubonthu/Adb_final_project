import {Badge} from '@mantine/core'
import {Link} from '@remix-run/react'
import {TailwindContainer} from '~/components/TailwindContainer'

const actions = [
	{
		title: 'Manage Orders',
		description: 'View and manage orders',
		href: 'orders',
	},
	{
		title: 'Manage Products',
		description: 'View and manage products',
		href: 'products',
	},
]

export default function AdminDashboard() {
	return (
		<div className="flex flex-col gap-4 p-4">
			<div className="bg-[rgb(129, 135, 80)]">
				<TailwindContainer>
					<div className="py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
						<h2 className="text-center text-4xl font-semibold tracking-tight text-gray-900">
							Admin Dashboard
						</h2>

						<ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
							{actions.map((action, actionIdx) => (
								<Card action={action} key={actionIdx} />
							))}
						</ul>
					</div>
				</TailwindContainer>
			</div>
		</div>
	)
}

function Card({action}: {action: typeof actions[number]}) {
	return (
		<li className="relative col-span-1 divide-y divide-gray-200 rounded-lg border border-gray-300 bg-white shadow">
			<div className="flex w-full items-center justify-between space-x-6 p-6">
				<div className="flex-1 truncate">
					<div className="flex flex-col items-center gap-3">
						<h3 className="truncate text-xl font-medium text-gray-900">
							{action.title}
						</h3>

						<Badge fullWidth={false} className="max-w-min">
							{action.description}
						</Badge>
					</div>
				</div>
			</div>

			<Link to={action.href} className="focus:outline-none">
				{/* Extend touch target to entire panel */}
				<span className="absolute inset-0" aria-hidden="true" />
			</Link>
		</li>
	)
}
