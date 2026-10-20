from pathlib import Path
import hashlib,json,os,shutil,subprocess,tempfile,sys

workspace=Path.cwd()
inventory=json.loads(Path("/tmp/gt-t15-s3-final.inventory.json").read_text())
assert inventory["success"] and inventory["stable"] and inventory["failed"]==0 and inventory["pending"]==0
assert inventory["todo"]==0 and all(r["other"]==0 for r in inventory["results"])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source={p:h for p,h in inventory["hashes"].items() if "dist" not in Path(p).parts}
emitted={p:h for p,h in inventory["hashes"].items() if p.startswith(("dist/","companion/dist/"))}
for p,h in source.items():assert sha(workspace/p)==h
scope=Path(tempfile.mkdtemp(prefix=".gt-t15-s3-clean-",dir=workspace.parent))
try:
 target=scope/"source";target.mkdir()
 for p,h in source.items():
  dst=target/p;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(workspace/p,dst)
  assert sha(dst)==h
 selection="docs/evidence/t15-s3-selection.json"
 (target/selection).parent.mkdir(parents=True,exist_ok=True)
 shutil.copy2(workspace/selection,target/selection)
 for name in ("home","cache","runtime"): (scope/name).mkdir(mode=0o700)
 for name in ("user.npmrc","global.npmrc"): (scope/name).write_text("")
 env={"T01_NODE_HOME":os.environ["T01_NODE_HOME"],"PATH":os.environ["T01_NODE_HOME"]+"/bin:/usr/bin:/bin",
      "HOME":str(scope/"home"),"XDG_CONFIG_HOME":str(scope/"home/config"),
      "XDG_DATA_HOME":str(scope/"home/data"),"XDG_STATE_HOME":str(scope/"home/state"),
      "XDG_RUNTIME_DIR":str(scope/"runtime"),"NPM_CONFIG_CACHE":str(scope/"cache"),
      "NPM_CONFIG_USERCONFIG":str(scope/"user.npmrc"),"NPM_CONFIG_GLOBALCONFIG":str(scope/"global.npmrc"),
      "LANG":"C.UTF-8"}
 assert not(target/"node_modules").exists() and not(target/"dist").exists()
 checks=[]
 with open("/tmp/gt-t15-s3-clean-build.log","w") as log:
  for command in [["npm","ci","--ignore-scripts"],["npm","run","typecheck"],["npm","run","lint:production"],["npm","run","format:check:production"],["npm","run","build"]]:
   result=subprocess.run(command,cwd=target,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=300)
   checks.append({"command":" ".join(command),"exitCode":result.returncode})
   print(" ".join(command),result.returncode,flush=True)
   if result.returncode:raise RuntimeError("Clean locked production check failed; diagnostics retained")
 assert all(sha(target/p)==h for p,h in source.items())
 assert all(sha(target/p)==h for p,h in emitted.items())
 print(len(source),"identical source inputs;",len(emitted),"byte-identical outputs",flush=True)
 result=subprocess.run(["python3","test/create-stdio/run-isolated.py",env["T01_NODE_HOME"]+"/bin/node",
    "/tmp/gt-t15-s3-provider/usr/bin/gnome-keyring-daemon","/tmp/gt-t15-s3-provider/usr/lib",selection,
    "/tmp/gt-t15-s3-clean"],cwd=target,env=env,timeout=600)
 assert result.returncode==0
 clean=json.loads(Path("/tmp/gt-t15-s3-clean.inventory.json").read_text())
 assert clean["stable"] and clean["success"] and clean["failed"]==0 and clean["pending"]==0
 assert clean["todo"]==0 and all(r["other"]==0 for r in clean["results"])
 assert all(sha(workspace/p)==h and sha(target/p)==h for p,h in source.items())
 assert all(sha(target/p)==h for p,h in emitted.items())
 summary={"algorithm":"sha256","sourceInputsCopied":len(source),"sourceInputsMatchWorkspace":True,
   "stableAcrossCleanReplay":True,"emittedOutputsByteIdentical":True,"emittedOutputCount":len(emitted),
   "checks":checks,"selectedReplayExitCode":result.returncode,"passed":clean["passed"],
   "failed":clean["failed"],"pending":clean["pending"],"selection":clean["selection"],
   "sourceInputs":source,"emittedOutputs":emitted}
finally:
 shutil.rmtree(scope)
summary["ownedCleanSnapshotRemoved"]=not scope.exists()
Path("/tmp/gt-t15-s3-clean-reproduction.json").write_text(json.dumps(summary,indent=2)+"\n")
print("Clean locked acceptance and owned cleanup PASS",flush=True)
