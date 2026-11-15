/**
 * Every exam shows the logo of what it's about: Java's cup, the OutSystems ring, and so on. The logo
 * is worked out from the exam's subject, so every exam in a subject has the same one. A subject that
 * matches nothing falls back to the exam's own name, and then to a plain rosette.
 *
 * Nothing is stored. To cover a new subject, add an entry here, say where its artwork comes from in
 * `scripts/build-icons.ts`, and run `npm run icons:build`.
 *
 * `terms` are whole words or phrases, in lower case, looked for in the name. The order matters when
 * a name matches more than one entry: the first wins, so products come before the languages they're
 * built on, and both come before the companies that own them. "Oracle Java" is Java, not Oracle.
 */
export type ExamIconDefinition = { key: string; name: string; terms: readonly string[] }

export const EXAM_ICONS: readonly ExamIconDefinition[] = [
  // AI
  { key: 'claude', name: 'Claude', terms: ['claude'] },
  { key: 'anthropic', name: 'Anthropic', terms: ['anthropic'] },
  { key: 'openai', name: 'OpenAI', terms: ['openai', 'chatgpt'] },
  { key: 'hugging-face', name: 'Hugging Face', terms: ['hugging face', 'huggingface'] },
  { key: 'tensorflow', name: 'TensorFlow', terms: ['tensorflow'] },
  { key: 'pytorch', name: 'PyTorch', terms: ['pytorch'] },

  // Low-code and business platforms
  { key: 'outsystems', name: 'OutSystems', terms: ['outsystems'] },
  { key: 'salesforce', name: 'Salesforce', terms: ['salesforce'] },
  { key: 'sap', name: 'SAP', terms: ['sap'] },
  { key: 'uipath', name: 'UiPath', terms: ['uipath'] },
  { key: 'appian', name: 'Appian', terms: ['appian'] },
  { key: 'power-bi', name: 'Power BI', terms: ['power bi', 'powerbi'] },
  { key: 'tableau', name: 'Tableau', terms: ['tableau'] },
  { key: 'snowflake', name: 'Snowflake', terms: ['snowflake', 'snowpro'] },
  { key: 'databricks', name: 'Databricks', terms: ['databricks'] },
  { key: 'splunk', name: 'Splunk', terms: ['splunk'] },
  { key: 'jira', name: 'Jira', terms: ['jira'] },
  { key: 'atlassian', name: 'Atlassian', terms: ['atlassian', 'confluence'] },
  { key: 'okta', name: 'Okta', terms: ['okta'] },

  // Cloud
  { key: 'aws', name: 'AWS', terms: ['aws', 'amazon web services'] },
  { key: 'azure', name: 'Azure', terms: ['azure'] },
  { key: 'google-cloud', name: 'Google Cloud', terms: ['google cloud', 'gcp'] },
  { key: 'firebase', name: 'Firebase', terms: ['firebase'] },
  { key: 'cloudflare', name: 'Cloudflare', terms: ['cloudflare'] },

  // Infrastructure and operations
  { key: 'kubernetes', name: 'Kubernetes', terms: ['kubernetes', 'k8s', 'cka', 'ckad', 'cks', 'kcna'] },
  { key: 'docker', name: 'Docker', terms: ['docker'] },
  { key: 'terraform', name: 'Terraform', terms: ['terraform'] },
  { key: 'hashicorp', name: 'HashiCorp', terms: ['hashicorp', 'vault', 'consul'] },
  { key: 'ansible', name: 'Ansible', terms: ['ansible'] },
  { key: 'jenkins', name: 'Jenkins', terms: ['jenkins'] },
  { key: 'prometheus', name: 'Prometheus', terms: ['prometheus'] },
  { key: 'grafana', name: 'Grafana', terms: ['grafana'] },
  { key: 'gitlab', name: 'GitLab', terms: ['gitlab'] },
  { key: 'github', name: 'GitHub', terms: ['github'] },
  { key: 'git', name: 'Git', terms: ['git'] },
  { key: 'openshift', name: 'OpenShift', terms: ['openshift'] },
  { key: 'red-hat', name: 'Red Hat', terms: ['red hat', 'redhat', 'rhcsa', 'rhce'] },
  { key: 'ubuntu', name: 'Ubuntu', terms: ['ubuntu'] },
  { key: 'linux-foundation', name: 'Linux Foundation', terms: ['linux foundation'] },
  { key: 'linux', name: 'Linux', terms: ['linux', 'lpic'] },
  { key: 'vmware', name: 'VMware', terms: ['vmware', 'vsphere'] },
  { key: 'nginx', name: 'NGINX', terms: ['nginx'] },

  // Data
  { key: 'kafka', name: 'Kafka', terms: ['kafka'] },
  { key: 'elasticsearch', name: 'Elasticsearch', terms: ['elasticsearch', 'elastic'] },
  { key: 'mysql', name: 'MySQL', terms: ['mysql'] },
  { key: 'postgresql', name: 'PostgreSQL', terms: ['postgresql', 'postgres'] },
  { key: 'mongodb', name: 'MongoDB', terms: ['mongodb', 'mongo'] },
  { key: 'redis', name: 'Redis', terms: ['redis'] },
  { key: 'cassandra', name: 'Cassandra', terms: ['cassandra'] },
  { key: 'neo4j', name: 'Neo4j', terms: ['neo4j'] },
  { key: 'graphql', name: 'GraphQL', terms: ['graphql'] },

  // Frameworks and tools
  { key: 'spring', name: 'Spring', terms: ['spring', 'spring boot'] },
  { key: 'react', name: 'React', terms: ['react', 'reactjs'] },
  { key: 'angular', name: 'Angular', terms: ['angular'] },
  { key: 'vue', name: 'Vue', terms: ['vue', 'vuejs'] },
  { key: 'nodejs', name: 'Node.js', terms: ['nodejs', 'node'] },
  { key: 'django', name: 'Django', terms: ['django'] },
  { key: 'laravel', name: 'Laravel', terms: ['laravel'] },
  { key: 'rails', name: 'Rails', terms: ['rails'] },
  { key: 'dotnet', name: '.NET', terms: ['dotnet'] },
  { key: 'flutter', name: 'Flutter', terms: ['flutter'] },
  { key: 'android', name: 'Android', terms: ['android'] },
  { key: 'selenium', name: 'Selenium', terms: ['selenium'] },
  { key: 'unity', name: 'Unity', terms: ['unity'] },
  { key: 'wordpress', name: 'WordPress', terms: ['wordpress'] },

  // Languages
  { key: 'javascript', name: 'JavaScript', terms: ['javascript'] },
  { key: 'typescript', name: 'TypeScript', terms: ['typescript'] },
  { key: 'python', name: 'Python', terms: ['python'] },
  { key: 'java', name: 'Java', terms: ['java'] },
  { key: 'kotlin', name: 'Kotlin', terms: ['kotlin'] },
  { key: 'swift', name: 'Swift', terms: ['swift'] },
  { key: 'go', name: 'Go', terms: ['golang', 'go'] },
  { key: 'rust', name: 'Rust', terms: ['rust'] },
  { key: 'php', name: 'PHP', terms: ['php'] },
  { key: 'ruby', name: 'Ruby', terms: ['ruby'] },
  { key: 'c-sharp', name: 'C#', terms: ['c#', 'csharp'] },
  { key: 'c-plusplus', name: 'C++', terms: ['c++', 'cpp'] },
  { key: 'scala', name: 'Scala', terms: ['scala'] },
  { key: 'dart', name: 'Dart', terms: ['dart'] },
  { key: 'html', name: 'HTML', terms: ['html', 'html5'] },
  { key: 'css', name: 'CSS', terms: ['css', 'css3'] },

  // Companies and certification bodies
  { key: 'oracle', name: 'Oracle', terms: ['oracle'] },
  { key: 'microsoft', name: 'Microsoft', terms: ['microsoft'] },
  { key: 'google', name: 'Google', terms: ['google'] },
  { key: 'ibm', name: 'IBM', terms: ['ibm'] },
  { key: 'nvidia', name: 'NVIDIA', terms: ['nvidia'] },
  { key: 'adobe', name: 'Adobe', terms: ['adobe'] },
  { key: 'apple', name: 'Apple', terms: ['apple', 'ios', 'macos'] },
  { key: 'cisco', name: 'Cisco', terms: ['cisco', 'ccna', 'ccnp', 'ccie'] },
  { key: 'comptia', name: 'CompTIA', terms: ['comptia', 'security+', 'network+', 'a+'] },
  { key: 'isc2', name: 'ISC2', terms: ['isc2', 'cissp', 'ccsp', 'sscp'] },
  { key: 'fortinet', name: 'Fortinet', terms: ['fortinet', 'fortigate'] },
  { key: 'palo-alto', name: 'Palo Alto Networks', terms: ['palo alto', 'pcnsa', 'pcnse'] },
  { key: 'juniper', name: 'Juniper', terms: ['juniper', 'jncia'] },
  { key: 'cncf', name: 'CNCF', terms: ['cncf'] },
  { key: 'scrum', name: 'Scrum', terms: ['scrum', 'csm', 'psm'] },
]

/** Lower case, with punctuation as spaces, so terms match whole words. Keeps `+` and `#` for C++, C# and A+. */
function words(text: string) {
  const plain = text
    .toLowerCase()
    .replaceAll('.net', ' dotnet ')
    .replaceAll('node.js', 'nodejs')
    .replaceAll('vue.js', 'vuejs')
    .replaceAll(/[^a-z0-9+#]+/g, ' ')
    .trim()
  return ` ${plain} `
}

function match(text: string) {
  const haystack = words(text)
  return EXAM_ICONS.find((icon) => icon.terms.some((term) => haystack.includes(` ${term} `)))?.key ?? null
}

/**
 * The logo for an exam, as an icon key, or null when nothing fits. The subject decides, so a
 * subject's exams all match. The exam's name is used only when the subject gives no answer.
 */
export function examIconFor(subject: string, examName = ''): string | null {
  return match(subject) ?? match(examName)
}
