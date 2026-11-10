import * as store from '../../src/lib/hybridLocalStore';
import * as recovery from '../../src/lib/hybridWorkspaceRecovery';
import * as workspace from '../../src/lib/offlineWorkspaceStore';
import { buildIndexedBalances } from '../../src/lib/indexedBalance';
window.hybridQA = { ...store, ...recovery, ...workspace, buildIndexedBalances };
