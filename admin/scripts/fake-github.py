# A local stand-in for the GitHub API endpoints the admin uses (refs, commits, trees,
# contents, blobs), backed by a bare git repository. For testing publish and rollback
# end to end without touching the real repository:
#
#   git clone --bare --depth 1 file://$PWD/.. /tmp/fake-remote.git
#   python3 scripts/fake-github.py /tmp/fake-remote.git        # listens on 127.0.0.1:8798
#   .dev.vars: GITHUB_TOKEN=local-test, GITHUB_API=http://127.0.0.1:8798
# A stand-in for the GitHub API endpoints the admin uses, backed by a local bare git repository.
import base64, json, os, re, subprocess, sys, tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
REPO = sys.argv[1]
def git(*args, input=None, env=None):
    return subprocess.run(['git', '--git-dir', REPO, *args], input=input, capture_output=True, check=True, env={**os.environ, **(env or {})}).stdout
class H(BaseHTTPRequestHandler):
    def send(self, obj, code=200):
        b = json.dumps(obj).encode(); self.send_response(code); self.send_header('content-type', 'application/json'); self.send_header('content-length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def body(self): return json.loads(self.rfile.read(int(self.headers.get('content-length', 0))) or b'{}')
    def do_GET(self):
        path, _, query = self.path.partition('?')
        m = re.match(r'/repos/[^/]+/[^/]+(/.*)', path); p = m.group(1)
        try:
            if p.startswith('/actions/workflows/'):
                # A fixed run per workflow; the model refresh "fails", to show how failures look.
                wf = p.split('/')[3]
                return self.send({'workflow_runs': [{'status': 'completed', 'conclusion': 'failure' if wf == 'refresh-models.yml' else 'success', 'run_started_at': '2026-11-27T00:00:00Z', 'event': 'schedule', 'html_url': f'https://github.com/example/actions/{wf}'}]})
            if p.startswith('/git/ref/heads/'):
                return self.send({'object': {'sha': git('rev-parse', 'refs/heads/' + p.split('/')[-1]).decode().strip()}})
            if p.startswith('/git/commits/'):
                raw = git('cat-file', '-p', p.split('/')[-1]).decode()
                return self.send({'tree': {'sha': re.search(r'^tree (\w+)', raw, re.M).group(1)}, 'parents': [{'sha': s} for s in re.findall(r'^parent (\w+)', raw, re.M)]})
            if p.startswith('/git/trees/'):
                out = git('ls-tree', '-r', '-t', p.split('/')[-1]).decode()
                tree = [{'path': l.split('\t', 1)[1], 'type': l.split()[1], 'sha': l.split()[2]} for l in out.splitlines()]
                return self.send({'tree': tree, 'truncated': False})
            if p.startswith('/contents/'):
                ref = re.search(r'ref=([^&]+)', query).group(1); fp = p[len('/contents/'):]
                try: data = git('show', f'{ref}:{fp}'); sha = git('rev-parse', f'{ref}:{fp}').decode().strip()
                except subprocess.CalledProcessError: return self.send({'message': 'Not Found'}, 404)
                return self.send({'sha': sha, 'content': base64.b64encode(data).decode(), 'encoding': 'base64'})
        except subprocess.CalledProcessError as e: return self.send({'message': e.stderr.decode()}, 404)
        self.send({'message': 'unknown'}, 404)
    def do_POST(self):
        p = re.match(r'/repos/[^/]+/[^/]+(/.*)', self.path).group(1); b = self.body()
        if p == '/git/blobs':
            return self.send({'sha': git('hash-object', '-w', '--stdin', input=base64.b64decode(b['content'])).decode().strip()})
        if p == '/git/trees':
            idx = tempfile.mktemp(); env = {'GIT_INDEX_FILE': idx}
            git('read-tree', b['base_tree'], env=env)
            for e in b['tree']:
                if e.get('sha', 'x') is None: git('update-index', '--index-info', input=f"0 {'0'*40}\t{e['path']}\n".encode(), env=env); continue
                sha = e.get('sha') or git('hash-object', '-w', '--stdin', input=e['content'].encode()).decode().strip()
                git('update-index', '--add', '--cacheinfo', f"100644,{sha},{e['path']}", env=env)
            return self.send({'sha': git('write-tree', env=env).decode().strip()})
        if p == '/git/commits':
            env = {'GIT_AUTHOR_NAME': 'admin', 'GIT_AUTHOR_EMAIL': 'admin@local', 'GIT_COMMITTER_NAME': 'admin', 'GIT_COMMITTER_EMAIL': 'admin@local'}
            return self.send({'sha': git('commit-tree', b['tree'], *sum([['-p', x] for x in b['parents']], []), '-m', b['message'], env=env).decode().strip()})
        self.send({'message': 'unknown'}, 404)
    def do_PATCH(self):
        p = re.match(r'/repos/[^/]+/[^/]+(/.*)', self.path).group(1); b = self.body()
        ref = 'refs/heads/' + p.split('/')[-1]; cur = git('rev-parse', ref).decode().strip()
        parents = re.findall(r'^parent (\w+)', git('cat-file', '-p', b['sha']).decode(), re.M)
        if not b.get('force') and cur not in parents: return self.send({'message': 'Update is not a fast forward'}, 422)
        git('update-ref', ref, b['sha']); self.send({'object': {'sha': b['sha']}})
    def log_message(self, *a): pass
ThreadingHTTPServer(('127.0.0.1', 8798), H).serve_forever()
