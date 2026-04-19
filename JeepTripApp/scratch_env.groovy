
def env = System.getenv()
println "PATH: ${env['PATH']}"
println "NODE: ${['which', 'node'].execute(env.collect { k, v -> "$k=$v" }, new File('.')).text.trim()}"
