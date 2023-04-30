import {ArrowLeftIcon, PlusIcon} from '@heroicons/react/24/solid'
import {Badge, Button, Modal, PasswordInput, TextInput} from '@mantine/core'
import {useDisclosure} from '@mantine/hooks'
import {Role} from '@prisma/client'
import type {ActionFunction} from '@remix-run/node'
import {json} from '@remix-run/node'
import {Link, useFetcher, useLoaderData} from '@remix-run/react'
import * as React from 'react'
import {z} from 'zod'
import {TailwindContainer} from '~/components/TailwindContainer'
import {db} from '~/lib/prisma.server'
import {badRequest, createPasswordHash} from '~/utils/misc.server'
import type {inferErrors} from '~/utils/validation'
import {validateAction} from '~/utils/validation'

const AddStaffSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Please enter a valid email'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const loader = async () => {
	const users = await db.user.findMany({
		where: {role: Role.STAFF},
	})

	return json({users})
}

interface ActionData {
	success: boolean
	fieldErrors?: inferErrors<typeof AddStaffSchema>
}

export const action: ActionFunction = async ({request}) => {
	const {fields, fieldErrors} = await validateAction(request, AddStaffSchema)

	if (fieldErrors) {
		return badRequest<ActionData>({success: false, fieldErrors})
	}

	await db.user.create({
		data: {
			name: fields.name,
			email: fields.email,
			password: await createPasswordHash(fields.password),
			role: Role.STAFF,
		},
	})
	return json({success: true})
}

export default function ManageOrganizers() {
	const fetcher = useFetcher<ActionData>()
	const {users} = useLoaderData<typeof loader>()

	const [isModalOpen, handleModal] = useDisclosure(false)

	const isSubmitting = fetcher.state !== 'idle'

	React.useEffect(() => {
		if (fetcher.state !== 'idle' && fetcher.submission === undefined) {
			return
		}

		if (fetcher.data?.success) {
			handleModal.close()
		}
		// handleModal is not meemoized, so we don't need to add it to the dependency array
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetcher.data?.success, fetcher.state, fetcher.submission])

	return (
		<>
			<TailwindContainer className="rounded-md">
				<div className="mt-8 px-4 py-10 sm:px-6 lg:px-8">
					<div className="sm:flex sm:flex-auto sm:items-center sm:justify-between">
						<div>
							<Button
								leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
								variant="subtle"
								size="md"
								component={Link}
								to=".."
								pl={0}
								mb={20}
							>
								Back
							</Button>
							<h1 className="text-3xl font-semibold text-gray-900">Staff</h1>
						</div>
						<div>
							<Button
								loading={isSubmitting}
								loaderPosition="left"
								onClick={() => handleModal.open()}
								variant="light"
							>
								<PlusIcon className="h-4 w-4" />
								<span className="ml-2">Add</span>
							</Button>
						</div>
					</div>
					<div className="mt-8 flex flex-col">
						<div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
							<div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
								<table className="min-w-full divide-y divide-gray-300">
									<thead>
										<tr>
											<th
												scope="col"
												className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
											>
												Name
											</th>

											<th
												scope="col"
												className="hidden py-3.5 px-3 text-left text-sm font-semibold text-gray-900 sm:table-cell"
											>
												Email
											</th>

											<th
												scope="col"
												className="hidden py-3.5 px-3 text-left text-sm font-semibold text-gray-900 sm:table-cell"
											>
												Active
											</th>
											<th
												scope="col"
												className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0"
											></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{users.map(user => (
											<tr key={user.id}>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
													{user.name}
												</td>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
													{user.email}
												</td>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
													<Badge
														color={user.disabled ? 'red' : 'blue'}
														size="sm"
													>
														{!user.disabled ? 'Active' : 'Inactive'}
													</Badge>
												</td>
												<td className="relative space-x-4 whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 md:pr-0">
													<div className="flex items-center gap-4">
														<Button
															variant="outline"
															compact
															size="sm"
															disabled={!user.disabled}
															onClick={() => {
																fetcher.submit(
																	{
																		userId: user.id,
																	},
																	{
																		method: 'post',
																		replace: true,
																		action: '/api/user/enable',
																	}
																)
															}}
														>
															Enable
														</Button>

														<Button
															variant="outline"
															compact
															size="sm"
															disabled={user.disabled}
															onClick={() => {
																fetcher.submit(
																	{
																		userId: user.id,
																	},
																	{
																		method: 'post',
																		replace: true,
																		action: '/api/user/disable',
																	}
																)
															}}
														>
															Disable
														</Button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</TailwindContainer>

			<Modal
				opened={isModalOpen}
				onClose={() => handleModal.close()}
				title="Add Staff"
				centered
				overlayBlur={1.2}
				overlayOpacity={0.6}
			>
				<fetcher.Form method="post" replace>
					<fieldset disabled={isSubmitting} className="flex flex-col gap-4">
						<TextInput
							name="name"
							label="Name"
							error={fetcher.data?.fieldErrors?.name}
							required
						/>

						<TextInput
							name="email"
							type="email"
							label="Email"
							error={fetcher.data?.fieldErrors?.email}
							required
						/>

						<PasswordInput
							name="password"
							label="Password"
							error={fetcher.data?.fieldErrors?.password}
							required
						/>

						<div className="mt-1 flex items-center justify-end gap-4">
							<Button
								variant="subtle"
								disabled={isSubmitting}
								onClick={() => handleModal.close()}
								color="red"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								loading={isSubmitting}
								loaderPosition="right"
							>
								Create
							</Button>
						</div>
					</fieldset>
				</fetcher.Form>
			</Modal>
		</>
	)
}
