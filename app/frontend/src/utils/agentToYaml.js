export function agentToYaml(a) {
  const lines = [
    `name: "${a.name || "Untitled Agent"}"`,
    ...(a.slug        ? [`slug: "${a.slug}"`]               : []),
    ...(a.description ? [`description: "${a.description}"`] : []),
    `enabled: ${a.enabled !== false}`,
    `trigger:`,
    `  type: ${a.trigger?.type || a.triggerType || "manual"}`,
  ];
  const cron = a.trigger?.cron || a.cronExpression;
  if (cron) lines.push(`  cron: "${cron}"`);
  if (a.group?.trim()) lines.push(`group: "${a.group.trim()}"`);
  const chains = a.chains ? (typeof a.chains === "string" ? JSON.parse(a.chains) : a.chains) : [];
  if (chains.length) {
    lines.push(`chains:`);
    chains.filter(c => c.nextAgent).forEach(c => {
      lines.push(`  - next_agent: "${c.nextAgent}"`);
      if (c.condition && c.condition !== "always") lines.push(`    condition: ${c.condition}`);
      if (c.triggerType && c.triggerType !== "automatic") lines.push(`    trigger_type: ${c.triggerType}`);
    });
  }
  const instructions = a.instructions || a.systemPrompt;
  if (instructions) {
    lines.push(`instructions: |`);
    instructions.split("\n").forEach(l => lines.push(`  ${l}`));
  }
  const steps = a.steps || (a.workflow ? (typeof a.workflow === "string" ? JSON.parse(a.workflow) : a.workflow) : []);
  if (steps?.length) {
    lines.push(`steps:`);
    steps.forEach(s => {
      lines.push(`  - name: "${s.name || ""}"`);
      if (s.content?.trim()) {
        lines.push(`    content: |`);
        s.content.split("\n").forEach(l => lines.push(`      ${l}`));
      }
    });
  }
  const conns = a.connectors || [];
  if (conns.length) {
    lines.push(`connectors:`);
    conns.forEach(c => {
      lines.push(`  - connection_name: "${c.name}"`);
      lines.push(`    connection_type: ${c.type}`);
    });
  }
  const params = a.params || [];
  if (params.length) {
    lines.push(`params:`);
    params.forEach(p => {
      lines.push(`  - name: ${p.name}`);
      if (p.label)   lines.push(`    label: "${p.label}"`);
      if (p.default) lines.push(`    default: "${p.default}"`);
    });
  }
  return lines.join("\n");
}
