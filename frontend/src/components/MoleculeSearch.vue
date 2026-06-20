<template>
  <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-bold text-slate-400">分子数据库 ({{ store.molecules.length }})</h3>
      <span class="text-xs text-cyan-400">对比 {{ compare.compareIds.length }}/{{ MAX_COMPARE }}</span>
    </div>
    <input v-model="query" @input="onSearch" placeholder="搜索分子名/类别/SMILES..."
      class="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm mb-3 focus:outline-none focus:border-cyan-500" />
    <div class="space-y-1 max-h-80 overflow-y-auto">
      <div v-for="mol in store.filteredMolecules" :key="mol.id" @click="store.selectMolecule(mol)"
        :class="['cursor-pointer p-2 rounded-lg border transition-all',
          store.currentMolecule?.id === mol.id
            ? 'border-cyan-500 bg-cyan-900/30'
            : 'border-slate-700 bg-slate-900 hover:border-slate-500']">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <input type="checkbox" :checked="compare.isInCompare(mol.id)" @click.stop @change="onToggleCompare(mol)"
              class="h-3.5 w-3.5 accent-cyan-500 cursor-pointer" :disabled="compareDisabled(mol.id)" />
            <span class="text-sm font-bold text-slate-200">{{ mol.name }}</span>
          </div>
          <span class="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{{ mol.category }}</span>
        </div>
        <div class="text-xs text-slate-500 mt-1 font-mono">{{ mol.formula }} · MW {{ mol.mw }}</div>
      </div>
    </div>
    <div class="mt-3 flex gap-2">
      <button @click="compare.openCompare()" :disabled="compare.compareIds.length < 2"
        class="flex-1 text-xs px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold
          disabled:opacity-40 disabled:cursor-not-allowed">打开对比</button>
      <button v-if="compare.compareIds.length > 0" @click="compare.clearCompare()"
        class="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200">清空</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMoleculeStore } from '../store/molecule'
import { useCompareStore, MAX_COMPARE } from '../store/compare'
import type { MoleculeData } from '../types'

const store = useMoleculeStore()
const compare = useCompareStore()
const query = ref('')
function onSearch() { store.searchMolecules(query.value) }
function onToggleCompare(mol: MoleculeData) {
  compare.toggleCompare(mol)
}
function compareDisabled(id: number): boolean {
  if (compare.isInCompare(id)) return false
  if (compare.compareIds.length >= MAX_COMPARE) return true
  return false
}
</script>
