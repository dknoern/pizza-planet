"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useMemo,
  type ReactNode,
} from "react";

export type CartLineInput = {
  menuItemId: string;
  sizeId: string;
  toppingIds: string[];
  quantity: number;
  // Display-only — server recomputes everything authoritative at checkout.
  displayName?: string;
  displayUnitPriceCents?: number;
  displaySlug?: string;
  displaySauce?: "red" | "pesto" | "bbq" | "white" | null;
  displayVisualToppingIds?: string[];
};

export type CartState = {
  lines: CartLineInput[];
};

type Action =
  | { type: "ADD"; line: CartLineInput }
  | { type: "REMOVE"; index: number }
  | { type: "SET_QTY"; index: number; quantity: number }
  | { type: "CLEAR" }
  | { type: "REPLACE"; state: CartState };

const STORAGE_KEY = "pp_cart_v1";

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "ADD":
      return { lines: [...state.lines, action.line] };
    case "REMOVE":
      return { lines: state.lines.filter((_, i) => i !== action.index) };
    case "SET_QTY":
      return {
        lines: state.lines.map((l, i) =>
          i === action.index ? { ...l, quantity: Math.max(1, action.quantity) } : l,
        ),
      };
    case "CLEAR":
      return { lines: [] };
    case "REPLACE":
      return action.state;
    default:
      return state;
  }
}

type CartContextValue = {
  state: CartState;
  add: (line: CartLineInput) => void;
  remove: (index: number) => void;
  setQuantity: (index: number, qty: number) => void;
  clear: () => void;
  count: number;
  displaySubtotalCents: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lines: [] });

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        if (parsed && Array.isArray(parsed.lines)) {
          dispatch({ type: "REPLACE", state: parsed });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const add = useCallback((line: CartLineInput) => dispatch({ type: "ADD", line }), []);
  const remove = useCallback((index: number) => dispatch({ type: "REMOVE", index }), []);
  const setQuantity = useCallback(
    (index: number, quantity: number) => dispatch({ type: "SET_QTY", index, quantity }),
    [],
  );
  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const count = state.lines.reduce((acc, l) => acc + l.quantity, 0);
  const displaySubtotalCents = state.lines.reduce(
    (acc, l) => acc + (l.displayUnitPriceCents ?? 0) * l.quantity,
    0,
  );

  const value = useMemo<CartContextValue>(
    () => ({ state, add, remove, setQuantity, clear, count, displaySubtotalCents }),
    [state, add, remove, setQuantity, clear, count, displaySubtotalCents],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
