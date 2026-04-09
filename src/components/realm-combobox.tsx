"use client";

import { REALMS_BY_REGION } from "@/lib/realms";
import { formatRealmLabel } from "@/lib/ui-format";
import { useMemo } from "react";
import { SearchableSelect } from "@/components/searchable-select";

type RealmComboboxProps = {
  region: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
};

export function RealmCombobox({
  region,
  value,
  onChange,
  className = "",
}: RealmComboboxProps) {
  const realmSuggestions = useMemo(() => {
    const regionKey = region === "us" ? "us" : "eu";
    return REALMS_BY_REGION[regionKey];
  }, [region]);

  const options = useMemo(() => {
    return realmSuggestions.map((realmSlug) => ({
      value: realmSlug,
      label: formatRealmLabel(realmSlug),
    }));
  }, [realmSuggestions]);

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder="realm (e.g. kazzak)"
      className={className}
      searchable
    />
  );
}
