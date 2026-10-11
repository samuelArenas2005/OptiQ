"""
Script de exportación del modelo QaoaPINN desde PyTorch a ONNX Runtime.
Permite inferencia ultraligera en producción sin requerir PyTorch instalado.
"""
import os
import sys
import json

# Asegurar UTF-8 en Windows para evitar fallos con emojis del logger de torch
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

import torch
import numpy as np
import onnx
import onnxruntime as ort
from pinn_model import QaoaPINN

def export():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    weights_path = os.path.join(base_dir, "weights", "pinn_qaoa_weights.pt")
    onnx_path = os.path.join(base_dir, "weights", "pinn_qaoa.onnx")
    meta_path = os.path.join(base_dir, "weights", "pinn_metadata.json")

    print(f"[1/4] Cargando pesos desde {weights_path}...")
    if not os.path.exists(weights_path):
        raise FileNotFoundError(f"Pesos no encontrados: {weights_path}")

    model = QaoaPINN(in_features=17, hidden_dim=128)
    state_dict = torch.load(weights_path, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()

    dummy_input = torch.randn(1, 17, dtype=torch.float32)

    print(f"[2/4] Exportando a ONNX: {onnx_path}...")
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=["features"],
        output_names=["angles", "telemetry"],
        dynamic_axes={
            "features": {0: "batch_size"},
            "angles": {0: "batch_size"},
            "telemetry": {0: "batch_size"}
        },
        dynamo=False
    )

    print(f"[3/4] Verificando grafo ONNX...")
    onnx_model = onnx.load(onnx_path)
    onnx.checker.check_model(onnx_model)
    print(" Grafo ONNX verificado y válido.")

    print(f"[4/4] Comprobando equivalencia numérica PyTorch vs ONNX Runtime...")
    with torch.no_grad():
        pt_angles, pt_telem = model(dummy_input)

    ort_session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    ort_inputs = {"features": dummy_input.numpy()}
    ort_angles, ort_telem = ort_session.run(None, ort_inputs)

    diff_angles = np.max(np.abs(pt_angles.numpy() - ort_angles))
    diff_telem = np.max(np.abs(pt_telem.numpy() - ort_telem))

    print(f"  Max Diff Ángulos:   {diff_angles:.6e}")
    print(f"  Max Diff Telemetría: {diff_telem:.6e}")

    assert diff_angles < 1e-4, "Diferencia de ángulos demasiado alta"
    assert diff_telem < 1e-4, "Diferencia de telemetría demasiado alta"

    onnx_size_kb = os.path.getsize(onnx_path) / 1024
    print(f"\n Éxito total. Modelo ONNX exportado ({onnx_size_kb:.1f} KB) en:")
    print(f"  -> {onnx_path}")

if __name__ == "__main__":
    export()
