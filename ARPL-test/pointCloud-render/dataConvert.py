import json
import numpy as np
import pandas as pd
from pathlib import Path

def convert_pointcloud_data(input_file='pointCloudData.txt', 
                            output_dir='/home/raychen/VR_Interface/XR-Course/ARPL-test/pointCloud-render/'):

    """
    Convert point cloud data from nested list format to structured text formats.
    
    Args:
        input_file (str): Path to input file containing point cloud data
        output_dir (str): Directory to save output files
    
    Returns:
        dict: Dictionary containing statistics and file paths
    """
    
    # Read the input file
    try:
        with open(input_file, 'r') as file:
            file_content = file.read()
        
        # Parse the JSON data
        point_cloud_data = json.loads(file_content)
        print(f"Successfully loaded {len(point_cloud_data)} points from {input_file}")
        
    except FileNotFoundError:
        print(f"Error: File '{input_file}' not found.")
        return None
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON data: {e}")
        return None
    
    # Convert to numpy array for easier processing
    points_array = np.array(point_cloud_data)
    
    # Calculate statistics
    stats = {
        'total_points': len(point_cloud_data),
        'x_min': float(np.min(points_array[:, 0])),
        'x_max': float(np.max(points_array[:, 0])),
        'y_min': float(np.min(points_array[:, 1])),
        'y_max': float(np.max(points_array[:, 1])),
        'z_min': float(np.min(points_array[:, 2])),
        'z_max': float(np.max(points_array[:, 2]))
    }
    
    # Calculate spans
    stats['x_span'] = stats['x_max'] - stats['x_min']
    stats['y_span'] = stats['y_max'] - stats['y_min']
    stats['z_span'] = stats['z_max'] - stats['z_min']
    
    # Print statistics
    print("\nPoint Cloud Statistics:")
    print("=" * 40)
    print(f"Total points: {stats['total_points']}")
    print(f"X range: {stats['x_min']:.3f} to {stats['x_max']:.3f} (span: {stats['x_span']:.3f})")
    print(f"Y range: {stats['y_min']:.3f} to {stats['y_max']:.3f} (span: {stats['y_span']:.3f})")
    print(f"Z range: {stats['z_min']:.3f} to {stats['z_max']:.3f} (span: {stats['z_span']:.3f})")
    
    # Create output directory if it doesn't exist
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # Method 1: Using pandas (recommended for data analysis)
    df = pd.DataFrame(points_array, columns=['x', 'y', 'z'])
    
    # Save as CSV
    csv_file = output_path / 'pointCloud_structured.csv'
    df.to_csv(csv_file, index=False)
    print(f"\n✅ CSV file saved: {csv_file}")
    




if __name__ == "__main__":
    # Call the function to convert the data
    result = convert_pointcloud_data('/home/raychen/VR_Interface/XR-Course/ARPL-test/pointCloud-render/pointCloudData.txt')
    
    if result:
        print("\n🎉 Conversion completed successfully!")
        print("Files created:")
        for name, path in result['files'].items():
            print(f"  - {name}: {path}")
