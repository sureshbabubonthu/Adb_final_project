import type {ActionArgs, LoaderArgs} from '@remix-run/node'
import {redirect} from '@remix-run/node'
import {db} from '~/lib/prisma.server'

export const action = async ({request}: ActionArgs) => {
	const formData = await request.formData()
	const userId = formData.get('userId')?.toString()

	if (!userId) {
		return null
	}

	await db.user.update({
		where: {
			id: userId,
		},
		data: {
			disabled: true,
		},
	})
	return null
}

export const loader = async ({request}: LoaderArgs) => {
	return redirect('/')
}
