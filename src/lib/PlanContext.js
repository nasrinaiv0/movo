import React, { createContext, useContext } from 'react';
import { canUseFeatureInMode, effectiveAccessPlan } from './planAccess';

const PlanContext = createContext({ plan: 'free', can: () => false, requireFeature: () => false });
export function PlanProvider({ entitlement, onUpgrade, cloudMode = true, children }) {
  const can = feature => canUseFeatureInMode(entitlement, feature, cloudMode);
  const value = { plan: effectiveAccessPlan(entitlement, cloudMode), offline: !cloudMode, can, requireFeature: feature => {
    if (can(feature)) return true;
    onUpgrade?.(feature);
    return false;
  } };
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}
export const usePlan = () => useContext(PlanContext);
