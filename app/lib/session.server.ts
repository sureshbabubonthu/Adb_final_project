import type {User} from '@prisma/client'
import {Role} from '@prisma/client'
import {createCookieSessionStorage, redirect} from '@remix-run/node'
import invariant from 'tiny-invariant'
import {getUserById} from '~/lib/user.server'

invariant(process.env.SESSION_SECRET, 'SESSION_SECRET must be set')

export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: '__session',
		httpOnly: true,
		maxAge: 0,
		path: '/',
		sameSite: 'lax',
		secrets: [process.env.SESSION_SECRET],
		secure: process.env.NODE_ENV === 'production',
	},
})

const USER_SESSION_KEY = 'userId'
const USER_ROLE_KEY = 'userRole'
const fourteenDaysInSeconds = 60 * 60 * 24 * 14
const thirtyDaysInSeconds = 60 * 60 * 24 * 30

export async function getSession(request: Request) {
	const cookie = request.headers.get('Cookie')
	return sessionStorage.getSession(cookie)
}

/**
 * Returns the userId from the session.
 */
export async function getUserId(
	request: Request
): Promise<User['id'] | undefined> {
	const session = await getSession(request)
	const userId = session.get(USER_SESSION_KEY)
	return userId
}

export async function getUser(request: Request) {
	const userId = await getUserId(request)
	if (userId === undefined) return null

	const user = await getUserById(userId)
	if (user) return user

	throw await logout(request)
}

export async function requireUserId(
	request: Request,
	redirectTo: string = new URL(request.url).pathname
) {
	const userId = await getUserId(request)
	if (!userId) {
		const searchParams = new URLSearchParams([['redirectTo', redirectTo]])
		throw redirect(`/login?${searchParams}`)
	}

	return userId
}

export async function requireUser(
	request: Request,
	redirectTo: string = new URL(request.url).pathname
) {
	const userId = await requireUserId(request, redirectTo)
	const user = await getUserById(userId)
	if (user) return user

	throw await logout(request)
}

export async function createUserSession({
	request,
	userId,
	role,
	remember = false,
	redirectTo,
}: {
	request: Request
	userId: User['id']
	role: User['role']
	remember?: boolean
	redirectTo: string
}) {
	const session = await getSession(request)
	session.set(USER_SESSION_KEY, userId)
	session.set(USER_ROLE_KEY, role)

	return redirect(redirectTo, {
		headers: {
			'Set-Cookie': await sessionStorage.commitSession(session, {
				maxAge: remember ? fourteenDaysInSeconds : thirtyDaysInSeconds,
			}),
		},
	})
}

export async function logout(request: Request) {
	const session = await getSession(request)

	// For some reason destroySession isn't removing session keys
	// So, unsetting the keys manually
	session.unset(USER_SESSION_KEY)

	return redirect('/login', {
		headers: {
			'Set-Cookie': await sessionStorage.destroySession(session),
		},
	})
}

export async function isCustomer(request: Request) {
	const session = await getSession(request)
	return session.get(USER_ROLE_KEY) === Role.CUSTOMER
}

export async function isAdmin(request: Request) {
	const session = await getSession(request)
	return session.get(USER_ROLE_KEY) === Role.ADMIN
}
