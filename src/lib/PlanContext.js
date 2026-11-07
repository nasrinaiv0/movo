import React, { createContext, useContext } from 'react';
import { canUseFeature, effectivePlan } from './planAccess';

const PlanContext = createContext({ plan: 'free', can: () => false, requireFeature: () => false });
export function PlanProvider({ entitlement, onUpgrade, children }) {
  const can = feature => canUseFeature(entitlement, feature);
  const value = { plan: effectivePlan(entitlement), can, requireFeature: feature => {
    if (can(feature)) return true;
    onUpgrade?.(feature);
    return false;
  } };
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}
export const usePlan = () => useContext(PlanContext);
