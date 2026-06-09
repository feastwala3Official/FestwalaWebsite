import { createContext, useContext, useReducer } from 'react'
import { CONFIG } from '../lib/supabase'

const CartContext = createContext(null)

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const key = action.item.id + (action.item.variant || '')
      const existing = state.items.find(i => i.cartKey === key)
      if (existing) {
        return { ...state, items: state.items.map(i => i.cartKey === key ? { ...i, qty: i.qty + 1 } : i) }
      }
      return { ...state, items: [...state.items, { ...action.item, cartKey: key, qty: 1 }] }
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.cartKey !== action.cartKey) }
    case 'UPDATE_QTY': {
      if (action.qty <= 0) return { ...state, items: state.items.filter(i => i.cartKey !== action.cartKey) }
      return { ...state, items: state.items.map(i => i.cartKey === action.cartKey ? { ...i, qty: action.qty } : i) }
    }
    case 'CLEAR':
      return { ...state, items: [] }
    case 'OPEN':
      return { ...state, open: true }
    case 'CLOSE':
      return { ...state, open: false }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], open: false })

  const subtotal = state.items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const deliveryCharge = subtotal >= 269 ? 0 : 50
  const deliveryFree = subtotal >= 269
  const grandTotal = subtotal + 0 //(deliveryFree ? 0 : 50)
  const itemCount = state.items.reduce((sum, i) => sum + i.qty, 0)

  const addItem = (item) => dispatch({ type: 'ADD_ITEM', item })
  const removeItem = (cartKey) => dispatch({ type: 'REMOVE_ITEM', cartKey })
  const updateQty = (cartKey, qty) => dispatch({ type: 'UPDATE_QTY', cartKey, qty })
  const clearCart = () => dispatch({ type: 'CLEAR' })
  const openCart = () => dispatch({ type: 'OPEN' })
  const closeCart = () => dispatch({ type: 'CLOSE' })

  return (
    <CartContext.Provider value={{
      items: state.items, open: state.open,
      subtotal, deliveryCharge, deliveryFree, grandTotal, itemCount,
      addItem, removeItem, updateQty, clearCart, openCart, closeCart
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
