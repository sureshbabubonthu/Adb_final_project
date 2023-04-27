import type {ActionArgs} from '@remix-run/node'
import {
	json,
	unstable_composeUploadHandlers,
	unstable_createFileUploadHandler,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from '@remix-run/node'

export const action = async ({request}: ActionArgs) => {
	const uploadHandler = unstable_composeUploadHandlers(
		unstable_createFileUploadHandler({
			directory: 'public/uploads',
			maxPartSize: 5000000,
		}),
		unstable_createMemoryUploadHandler()
	)
	const formData = await unstable_parseMultipartFormData(request, uploadHandler)

	const image = formData.get('img')
	if (!image || typeof image === 'string') {
		return json({
			error: 'something wrong',
		})
	}

	return json({
		success: true,
		imgSrc: `/uploads/${image.name}`,
	})
}
