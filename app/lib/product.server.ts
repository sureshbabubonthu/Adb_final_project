import {db} from './prisma.server'

export function getAllProducts() {
	return db.product.findMany({})
}
