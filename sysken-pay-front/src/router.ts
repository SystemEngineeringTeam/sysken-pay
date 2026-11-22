// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `/`
  | `/admin`
  | `/admin/menu`
  | `/admin/phone-register`
  | `/admin/user-register`
  | `/balance`
  | `/buy`
  | `/buy/:paymentMethod`
  | `/buy/complete`
  | `/buy/list`
  | `/charge`
  | `/charge/complete`
  | `/charge/insert`
  | `/charge/select`

export type Params = {
  '/buy/:paymentMethod': { paymentMethod: string }
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
