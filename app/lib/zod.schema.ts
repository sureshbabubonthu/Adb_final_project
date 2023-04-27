import {z} from 'zod'

const name = z.string().min(1, 'Name is required')
const email = z.string().email('Invalid email')
const password = z.string().min(8, 'Password must be at least 8 characters')

export const LoginSchema = z.object({
	email,
	password,
	remember: z.enum(['on']).optional(),
	redirectTo: z.string().default('/'),
})

export const RegisterUserSchema = z
	.object({
		name,
		email,
		password,
		confirmPassword: password,
	})
	.refine(data => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['password', 'confirmPassword'],
	})

export const ManageProductSchema = z.object({
	productId: z.string().optional(),
	name: z.string().min(1, 'Name is required'),
	description: z.string().min(1, 'Description is required'),
	quantity: z.preprocess(
		Number,
		z.number().min(1, 'Quantity must be at least 1')
	),
	price: z.preprocess(
		Number,
		z.number().min(0, 'Price must be greater than 0')
	),
	image: z.string().min(1, 'Image is required'),
	category: z
		.string()
		.min(1, 'Category is required')
		.transform(value => value.split(',')),
})
