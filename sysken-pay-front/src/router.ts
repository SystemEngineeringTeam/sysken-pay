// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `/`
  | `/admin`
  | `/admin/item-list`
  | `/admin/item-menu`
  | `/admin/item-register`
  | `/admin/item-register/info`
  | `/admin/item-update`
  | `/admin/item-update/info`
  | `/admin/menu`
  | `/admin/phone-register`
  | `/admin/user-list`
  | `/admin/user-list/:userId`
  | `/admin/user-menu`
  | `/admin/user-register`
  | `/admin/user-register/name`
  | `/admin/user-update`
  | `/admin/user-update/name`
  | `/buy`
  | `/buy/:paymentMethod`
  | `/buy/complete`
  | `/buy/list`
  | `/charge`
  | `/charge/complete`
  | `/charge/insert`
  | `/charge/select`

export type Params = {
  '/admin/user-list/:userId': { userId: string }
  '/buy/:paymentMethod': { paymentMethod: string }
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
