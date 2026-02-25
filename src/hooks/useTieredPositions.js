import { useMemo } from 'react'
import useResponsive from './useResponsive.js'

/**
 * useTieredPositions — Computes fixed tiered layout positions for the 9 cascade domains.
 * Foundation (d1) at bottom, highest-order (d7) at top, d8/d9 flanking at tier 3.
 */
export default function useTieredPositions(nodes) {
  const { isPhone, isTablet } = useResponsive()

  const dims = useMemo(() => ({
    width: isPhone ? 600 : isTablet ? 750 : 900,
    height: isPhone ? 560 : isTablet ? 700 : 820,
    nodeW: isPhone ? 140 : isTablet ? 170 : 200,
    nodeH: isPhone ? 46 : isTablet ? 54 : 64,
    tierSpacing: isPhone ? 62 : isTablet ? 80 : 96,
    colSpacing: isPhone ? 190 : isTablet ? 240 : 280,
    fontSize: isPhone ? 10 : isTablet ? 11 : 13,
    subFontSize: isPhone ? 8 : isTablet ? 9 : 10,
  }), [isPhone, isTablet])

  const positions = useMemo(() => {
    const centerX = dims.width / 2
    const bottomY = dims.height - (isPhone ? 50 : 70)
    const pos = {}
    nodes.forEach((node) => {
      pos[node.id] = {
        x: centerX + (node.col - 1) * dims.colSpacing,
        y: bottomY - node.tier * dims.tierSpacing,
      }
    })
    return pos
  }, [nodes, dims, isPhone])

  return { positions, dims }
}
