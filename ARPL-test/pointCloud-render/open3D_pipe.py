import open3d as o3d
import numpy as np
import pandas as pd

# Load your CSV
df = pd.read_csv("/home/raychen/VR_Interface/XR-Course/ARPL-test/pointCloud-render/pointCloud_structured.csv")
points = df[['x', 'y', 'z']].values

# Create point cloud
pcd = o3d.geometry.PointCloud()
pcd.points = o3d.utility.Vector3dVector(points)

# Visualize
o3d.visualization.draw_geometries([pcd])