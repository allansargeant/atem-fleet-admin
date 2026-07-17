import { create } from 'zustand'
import {
  createDevice,
  createFleet,
  newId,
  type DeviceConfig,
  type FleetProject
} from '../../shared/config'
import type { ModelId } from '../../shared/models'

interface FleetState {
  fleet: FleetProject
  selectedId: string | null
  /** Path the fleet was last opened from / saved to, for the title bar. */
  filePath: string | null

  setFleet: (fleet: FleetProject, filePath?: string | null) => void
  setFleetName: (name: string) => void
  selectDevice: (id: string) => void

  addDevice: (model: ModelId) => void
  duplicateDevice: (id: string) => void
  removeDevice: (id: string) => void
  renameDevice: (id: string, name: string) => void
  /** Shallow-merge a patch into a device (used by every editor tab). */
  updateDevice: (id: string, patch: Partial<DeviceConfig>) => void
}

function nextDeviceName(fleet: FleetProject, model: ModelId): string {
  const count = fleet.devices.filter((d) => d.model === model).length
  return `ATEM ${count + 1}`
}

export const useFleet = create<FleetState>((set) => ({
  fleet: createFleet(),
  selectedId: null,
  filePath: null,

  setFleet: (fleet, filePath = null) =>
    set({ fleet, filePath, selectedId: fleet.devices[0]?.id ?? null }),
  setFleetName: (name) => set((s) => ({ fleet: { ...s.fleet, name } })),
  selectDevice: (id) => set({ selectedId: id }),

  addDevice: (model) =>
    set((s) => {
      const device = createDevice(model, nextDeviceName(s.fleet, model))
      return {
        fleet: { ...s.fleet, devices: [...s.fleet.devices, device] },
        selectedId: device.id
      }
    }),

  duplicateDevice: (id) =>
    set((s) => {
      const src = s.fleet.devices.find((d) => d.id === id)
      if (!src) return s
      const copy: DeviceConfig = {
        ...structuredClone(src),
        id: newId(),
        name: `${src.name} copy`
      }
      const idx = s.fleet.devices.findIndex((d) => d.id === id)
      const devices = [...s.fleet.devices]
      devices.splice(idx + 1, 0, copy)
      return { fleet: { ...s.fleet, devices }, selectedId: copy.id }
    }),

  removeDevice: (id) =>
    set((s) => {
      const devices = s.fleet.devices.filter((d) => d.id !== id)
      const selectedId = s.selectedId === id ? (devices[0]?.id ?? null) : s.selectedId
      return { fleet: { ...s.fleet, devices }, selectedId }
    }),

  renameDevice: (id, name) =>
    set((s) => ({
      fleet: {
        ...s.fleet,
        devices: s.fleet.devices.map((d) => (d.id === id ? { ...d, name } : d))
      }
    })),

  updateDevice: (id, patch) =>
    set((s) => ({
      fleet: {
        ...s.fleet,
        devices: s.fleet.devices.map((d) => (d.id === id ? { ...d, ...patch } : d))
      }
    }))
}))
