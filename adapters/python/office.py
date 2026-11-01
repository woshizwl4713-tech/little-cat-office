"""Copy this module and catctl.py together, or import from this checkout."""
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('catctl',Path(__file__).resolve().parents[2]/'scripts'/'catctl.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
report=module.report

def assign(from_id, recipients, task, event_id=None, url=None):
    return module.request({'from':from_id,'to':recipients,'task':task,'id':event_id},url,path='/api/assign')
