import { useMemo } from 'react';
import { useSimStore } from '../state/store';
import { deriveDrugProfile } from './pharmacokinetics';
import type { DrugProfile } from '../types';

export function useDrugProfile(): DrugProfile {
  const drugType = useSimStore((s) => s.params.drugType);
  const pKa = useSimStore((s) => s.params.pKa);
  const logP = useSimStore((s) => s.params.logP);
  const pgpSubstrate = useSimStore((s) => s.params.pgpSubstrate);
  const bloodPH = useSimStore((s) => s.env.bloodPH);
  const meningitis = useSimStore((s) => s.env.meningitis);
  return useMemo(
    () => deriveDrugProfile({ drugType, pKa, logP, pgpSubstrate }, { bloodPH, meningitis }),
    [drugType, pKa, logP, pgpSubstrate, bloodPH, meningitis],
  );
}
