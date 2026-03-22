// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `/`
  | `/admin`
  | `/admin/dashboard`
  | `/admin/item-register`
  | `/admin/item-register/info`
  | `/admin/item-update`
  | `/admin/item-update/info`
  | `/admin/menu`
  | `/admin/user-register`
  | `/admin/user-register/name`
  | `/buy`
  | `/buy/:paymentMethod`
  | `/buy/:paymentMethod/confirm`
  | `/buy/complete`
  | `/buy/confirm`
  | `/buy/list`
  | `/charge`
  | `/charge/insert`
  | `/charge/select`

export type Params = {
  '/buy/:paymentMethod': { paymentMethod: string }
  '/buy/:paymentMethod/confirm': { paymentMethod: string }
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
