#ifndef MATHEMATICS_H
#define MATHEMATICS_H
#include "types_common.h"

#define GLM_FORCE_ALIGNED_GENTYPES
#define GLM_ENABLE_EXPERIMENTAL
//#define GLM_FORCE_INLINE
#define GLM_FORCE_RADIANS
#define GLM_FORCE_INTRINSICS

#ifdef MATHEMATICS_LOCAL_INCLUDE

#include "glm/glm.hpp"
#ifndef MATHEMATICS_DONT_USE_ALIGNED
#include "glm/gtc/type_aligned.hpp"
#endif
#include "glm/gtc/matrix_transform.hpp"
#include "glm/gtc/type_ptr.hpp"
#include "glm/ext.hpp"
#include "glm/gtc/quaternion.hpp"
#include "glm/gtx/norm.hpp"
#include "glm/gtx/matrix_decompose.hpp"
#include "glm/gtx/transform2.hpp"
#include "glm/gtx/spline.hpp"

#else

#include <glm/glm.hpp>
#ifndef MATHEMATICS_DONT_USE_ALIGNED
#include <glm/gtc/type_aligned.hpp>
#endif
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <glm/ext.hpp>
#include <glm/gtc/quaternion.hpp>
#include <glm/gtx/norm.hpp>
#include <glm/gtx/matrix_decompose.hpp>
#include <glm/gtx/transform2.hpp>

#endif

#ifndef MATHEMATICS_DONT_USE_ALIGNED
typedef glm::aligned_vec2  Vector2;
typedef glm::aligned_vec3  Vector3;
typedef glm::aligned_vec4  Vector4;
typedef glm::aligned_ivec2 IntVector2;
typedef glm::aligned_ivec3 IntVector3;
typedef glm::aligned_ivec4 IntVector4;
typedef glm::aligned_mat3  Matrix3;
typedef glm::aligned_mat4  Matrix4;
typedef glm::qua<float, glm::aligned_highp> Quaternion;
#else
typedef glm::vec2  Vector2;
typedef glm::vec3  Vector3;
typedef glm::vec4  Vector4;
typedef glm::ivec2 IntVector2;
typedef glm::ivec3 IntVector3;
typedef glm::ivec4 IntVector4;
typedef glm::mat3  Matrix3;
typedef glm::mat4  Matrix4;
typedef glm::qua<float, glm::highp> Quaternion;
#endif

typedef Vector2    Vec2;
typedef Vector3    Vec3;
typedef Vector4    Vec4;
typedef IntVector2 iVec2;
typedef IntVector3 iVec3;
typedef IntVector4 iVec4;
typedef Matrix3    Mat3;
typedef Matrix4    Mat4;
typedef Quaternion Quat;

typedef Vector2    vec2;
typedef Vector3    vec3;
typedef Vector4    vec4;
typedef IntVector2 ivec2;
typedef IntVector3 ivec3;
typedef IntVector4 ivec4;
typedef Matrix3    mat3;
typedef Matrix4    mat4;
typedef Quaternion quat;

// typedef Vector2    float2;
// typedef Vector3    float3;
// typedef Vector4    float4;
// typedef IntVector2 int2;
// typedef IntVector3 int3;
// typedef IntVector4 int4;

// unaligned

typedef glm::vec2  Vector2_unaligned;
typedef glm::vec3  Vector3_unaligned;
typedef glm::vec4  Vector4_unaligned;
typedef glm::ivec2 IntVector2_unaligned;
typedef glm::ivec3 IntVector3_unaligned;
typedef glm::ivec4 IntVector4_unaligned;
typedef glm::mat3  Matrix3_unaligned;
typedef glm::mat4  Matrix4_unaligned;
typedef glm::qua<float, glm::highp> Quaternion_unaligned;

typedef Vector2_unaligned    Vec2_ua;
typedef Vector3_unaligned    Vec3_ua;
typedef Vector4_unaligned    Vec4_ua;
typedef IntVector2_unaligned iVec2_ua;
typedef IntVector3_unaligned iVec3_ua;
typedef IntVector4_unaligned iVec4_ua;
typedef Matrix3_unaligned    Mat3_ua;
typedef Matrix4_unaligned    Mat4_ua;
typedef Quaternion_unaligned Quat_ua;

typedef Vector2_unaligned    vec2_ua;
typedef Vector3_unaligned    vec3_ua;
typedef Vector4_unaligned    vec4_ua;
typedef IntVector2_unaligned ivec2_ua;
typedef IntVector3_unaligned ivec3_ua;
typedef IntVector4_unaligned ivec4_ua;
typedef Matrix3_unaligned    mat3_ua;
typedef Matrix4_unaligned    mat4_ua;
typedef Quaternion_unaligned quat_ua;

// typedef Vector2_unaligned    float2_ua;
// typedef Vector3_unaligned    float3_ua;
// typedef Vector4_unaligned    float4_ua;
// typedef IntVector2_unaligned int2_ua;
// typedef IntVector3_unaligned int3_ua;
// typedef IntVector4_unaligned int4_ua;

typedef glm::tvec4<u8> U8Vector4;
typedef U8Vector4      u8Vec4;
typedef U8Vector4      u8vec4;

typedef glm::tvec2<u16> U16Vector2;
typedef U16Vector2      u16Vec2;
typedef U16Vector2      u8vec2;

#include <limits>

#define POSITIVE_INFINITY (std::numeric_limits<f64>::infinity())
#define NEGATIVE_INFINITY (-POSITIVE_INFINITY)


namespace m {

template<typename T>
inline T min(T val_a, T val_b)
{
    return glm::min(val_a, val_b);
}

inline float32 min(float32 val_a, float32 val_b)
{
    return (val_a <= val_b) ? val_a : val_b;
}

#ifndef TYPES_32_BIT
inline float64 min(float64 val_a, float64 val_b)
{
    return (val_a <= val_b) ? val_a : val_b;
}
#endif

inline int32 min(int32 val_a, int32 val_b)
{
    return (val_a <= val_b) ? val_a : val_b;
}

#ifndef TYPES_32_BIT
inline int64 min(int64 val_a, int64 val_b)
{
    return (val_a <= val_b) ? val_a : val_b;
}
#endif

template<typename T>
inline T max(T val_a, T val_b)
{
    return glm::max(val_a, val_b);
}

inline float32 max(float32 val_a, float32 val_b)
{
    return (val_a > val_b) ? val_a : val_b;
}

#ifndef TYPES_32_BIT
inline float64 max(float64 val_a, float64 val_b)
{
    return (val_a > val_b) ? val_a : val_b;
}
#endif

inline int32 max(int32 val_a, int32 val_b)
{
    return (val_a > val_b) ? val_a : val_b;
}

#ifndef TYPES_32_BIT
inline int64 max(int64 val_a, int64 val_b)
{
    return (val_a > val_b) ? val_a : val_b;
}
#endif

template<typename T>
inline T abs(T val)
{
    return glm::abs(val);
}

template<typename T>
inline float32 absf32(T val)
{
    return glm::abs(val);
}

template<typename T>
inline T cos(T val)
{
    return glm::cos(val);
}

template<typename T>
inline float32 cosf32(T val)
{
    return glm::cos(val);
}

template<typename T>
inline T sin(T val)
{
    return glm::sin(val);
}

template<typename T>
inline float32 sinf32(T val)
{
    return glm::sin(val);
}

inline f32 lerp(f32 a, f32 b, f32 t)
{
    return (1 - t) * a + t * b;
}

#ifndef TYPES_32_BIT
inline f64 lerp(f64 a, f64 b, f64 t)
{
    return (1 - t) * a + t * b;
}
#endif

inline vec2 lerp(vec2 a, vec2 b, f32 t)
{
    return {
        lerp(a[0], b[0], t),
        lerp(a[1], b[1], t)
    };
}

inline vec3 lerp(vec3 a, vec3 b, f32 t)
{
    return {
        lerp(a[0], b[0], t),
        lerp(a[1], b[1], t),
        lerp(a[2], b[2], t)
    };
}

#define SIN01_RETURN_VAL ((m::sin(val) + 1.0) / 2.0)
#ifndef TYPES_32_BIT
inline float64 sin01(float64 val)
{
    return SIN01_RETURN_VAL;
}
#endif

inline float32 sin01(float32 val)
{
    return SIN01_RETURN_VAL;
}
#undef SIN01_RETURN_VAL

#define COS01_RETURN_VAL ((m::cos(val) + 1.0) / 2.0)
#ifndef TYPES_32_BIT
inline float64 cos01(float64 val)
{
    return COS01_RETURN_VAL;
}
#endif

inline float32 cos01(float32 val)
{
    return COS01_RETURN_VAL;
}
#undef COS01_RETURN_VAL

constexpr bool is_powerof2(uint64 N)
{
    return N && ((N & (N - 1)) == 0);
}

constexpr uint64 next_powerof2_ge(uint64 n)
{
    if (is_powerof2(n)) {
        return n;
    }
    
    return glm::nextPowerOfTwo(n);
}

constexpr bool is_pow_2_greater_equal_4(usize N)
{
    return N >= 4 && is_powerof2(N);
}

template <typename T>
inline T clamp(T x, T min, T max)
{
    return glm::clamp(x, min, max);
}

template <typename T>
inline T sign(T val)
{
    return glm::sign(val);
}

template <typename T=float32>
inline static T smoothstep(T x)
{
    return glm::smoothstep<T>(0, 1, x);
}

template <typename T=float32>
inline static T inverse_smoothstep(T x)
{
    return 0.5 - m::sin(glm::asin(1.0-2.0*x)/3.0);
}

inline float32 sqrt(float32 val)
{
    return glm::sqrt(val);
}

#ifndef TYPES_32_BIT
inline float64 sqrt(float64 val)
{
    return glm::sqrt(val);
}
#endif

static inline vec2 vec2_zero()
{
    return vec2(0.0f);
}
static inline vec3 vec3_zero()
{
    return vec3(0.0f);
}
static inline vec4 vec4_zero()
{
    return vec4(0.0f);
}
static inline mat4 mat4_identity()
{
    return mat4(1.0f);
}

static inline float32 circular_rotation(float32 radius, float32 displacement)
{
    return displacement / radius;
}

static inline float32 circular_rotation(float32 radius, vec2 initial_position, vec2 final_position)
{
    return circular_rotation(radius, glm::distance(initial_position, final_position));
}


#define MTT_PI32 (glm::pi<f32>())
#define MTT_TAU32 (2 * glm::pi<f32>())

#define MTT_PI64 (glm::pi<f64>())
#define MTT_TAU64 (2 * glm::pi<f64>())

#define MTT_PI (MTT_PI64)
#define MTT_TAU (2 * MTT_PI)

//const f32 PI32  = MTT_PI32;
//const f32 TAU32 = MTT_TAU32;
//const f64 PI64  = MTT_PI64;
//const f64 TAU64 = MTT_TAU64;
//const f32 PI  = MTT_PI;
//const f64 TAU = MTT_TAU;

inline f32 atan2pos_32(f64 y, f64 x)
{
    f32 val = glm::atan2<f32>(-y, x);
    
    return (val < 0) ? val + 2 * glm::pi<f64>() : val;
}
inline f64 atan2pos_64(f64 y, f64 x)
{
    f64 val = glm::atan2<f64>(-y, x);
    
    return (val < 0) ? val + 2 * glm::pi<f64>() : val;
}

inline f32 dist_squared(Vec3 v, Vec3 w)
{
    f32 dx = v.x - w.x;
    f32 dy = v.y - w.y;
    f32 dz = v.z - w.z;
    return (dx * dx) + (dy * dy) + (dz * dz);
}

inline f32 dist_squared(Vec2 v, Vec2 w)
{
    f32 dx = v.x - w.x;
    f32 dy = v.y - w.y;
    return (dx * dx) + (dy * dy);
}

inline f32 dist(Vec3 v, Vec3 w)
{
    return glm::distance(v, w);
}

inline f32 dist(Vec2 v, Vec2 w)
{
    return glm::distance(v, w);
}

#ifndef TYPES_32_BIT
inline f64 dist_to_segment_squared(Vec3 v, Vec3 w, Vec3 p)
{
    const f64 l2 = dist_squared(v, w);
    if (l2 == 0.0) {
        return dist_squared(p, v);
    }
    
    
    const f64 t = m::max(0.0, m::min(1.0, glm::dot(p - v, w - v) / l2));
    return dist_squared(p, Vec3(v.x + t * (w.x - v.x), v.y + t * (w.y - v.y), 0.0));
}
#endif

inline f32 dist_to_segment_squared(Vec2 v, Vec2 w, Vec2 p)
{
    const f32 l2 = dist_squared(v, w);
    if (l2 == 0.0) {
        return dist_squared(p, v);
    }
    
    const f32 t = m::max(0.0f, m::min(1.0f, glm::dot(p - v, w - v) / l2));
    return dist_squared(p, Vec2(v.x + t * (w.x - v.x), v.y + t * (w.y - v.y)));
}

inline f64 dist_to_segment(Vec3 v, Vec3 w, Vec3 p)
{
    return glm::sqrt(dist_to_segment_squared(v, w, p));
}

inline float64 angular_velocity(float64 radians, float64 time_delta)
{
    return radians / time_delta;
}

inline Vec2 angular_impulse(float64 angular_velocity, Vec2 center, Vec2 point)
{
    return -angular_velocity * Vec2(-(point.y - center.y), (point.x - center.x));
}


inline Mat4 rotate_around(vec3 orientation, vec3 p)
{
    Mat4 m_out = Mat4(1.0f);
    m_out = glm::translate(m_out, p);
    
    Mat4 rot =  glm::eulerAngleXYZ(orientation.y, orientation.x, orientation.z);
    
    m_out = m_out * rot;
    
    m_out = glm::translate(m_out, -p);
    
    return m_out;
    
}

static mat4 rotate_around_with_matrix(mat4& m, mat4& rot_global, mat4& rot_local, vec3 center_offset)
{
    return rot_global * m * glm::translate(m::mat4_identity(), -center_offset) * rot_local * glm::translate(m::mat4_identity(), center_offset);
}



//inline vec3 rotate_around(vec3 out_point, vec3 around_point, vec3 orientation)
//{
//    float s = m::sin(angle);
//    float c = m::cos(angle);
//
//    // translate point back to origin:
//    p.x -= cx;
//    p.y -= cy;
//
//    // rotate point
//    float xnew = p.x * c - p.y * s;
//    float ynew = p.x * s + p.y * c;
//
//    // translate point back:
//    p.x = xnew + cx;
//    p.y = ynew + cy;
//    return p;
//}

inline void Vec2_print(Vec2 v)
{
    MTT_print("[%f,%f]\n", v[0], v[1]);
}
inline void Vec3_print(Vec3 v)
{
    MTT_print("[%f,%f,%f]\n", v[0], v[1], v[2]);
}
inline void Vec4_print(Vec4 v)
{
    MTT_print("[%f,%f,%f,%f]\n", v[0], v[1], v[2], v[3]);
}


static const vec3 UP2D    = vec3(0.0f, -1.0f, 0.0f);
static const vec3 DOWN2D  = vec3(0.0f, 1.0f, 0.0f);
static const vec3 LEFT2D  = vec3(-1.0f, 0.0f, 0.0f);
static const vec3 RIGHT2D = vec3(1.0f, 0.0f, 0.0f);



inline static float64 determinant_matrix3x3(mat3& m)
{
    float64 determinant  = m[0][0] * (m[1][1]*m[2][2] - m[1][2] * m[2][1]);
    determinant -= m[0][1] * (m[1][0]*m[2][2] - m[1][2] * m[2][0]);
    determinant += m[0][2] * (m[1][0]*m[2][1] - m[1][1] * m[2][0]);
    
    return determinant;
}
inline static float64 determinant_matrix3x3_last_column_ones(mat3& m)
{
#define A m[0][0]
#define B m[0][1]
#define C m[0][2]
#define D m[1][0]
#define E m[1][1]
#define F m[1][2]
#define G m[2][0]
#define H m[2][1]
#define I m[2][2]
    float64 determinant  = ((D*H) - (G*E));
    determinant -= ((A*H) - (G*B));
    determinant += ((A*E) - (D*B));
#undef A
#undef B
#undef C
#undef D
#undef E
#undef F
#undef G
#undef H
#undef I
    return determinant;
}


inline static void scale_adjoint_matrix3x3(mat3& a, float64 s, mat3& m)
{
    a[0][0] = (s) * (m[1][1] * m[2][2] - m[1][2] * m[2][1]);
    a[1][0] = (s) * (m[1][2] * m[2][0] - m[1][0] * m[2][2]);
    a[2][0] = (s) * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    
    a[0][1] = (s) * (m[0][2] * m[2][1] - m[0][1] * m[2][2]);
    a[1][1] = (s) * (m[0][0] * m[2][2] - m[0][2] * m[2][0]);
    a[2][1] = (s) * (m[0][1] * m[2][0] - m[0][0] * m[2][1]);
    
    a[0][2] = (s) * (m[0][1] * m[1][2] - m[0][2] * m[1][1]);
    a[1][2] = (s) * (m[0][2] * m[1][0] - m[0][0] * m[1][2]);
    a[2][2] = (s) * (m[0][0] * m[1][1] - m[0][1] * m[1][0]);
}


inline static mat3 inverse_matrix3x3(mat3& m)
{
    float64 determinant = determinant_matrix3x3(m);
    
    float64 factor = 1.0 / (determinant);
    
    mat3 out_m_inverse;
    scale_adjoint_matrix3x3(out_m_inverse, factor, m);
    
    return out_m_inverse;
}

inline static mat3 inverse_matrix3x3_last_column_ones(mat3& m)
{
    float64 determinant = determinant_matrix3x3_last_column_ones(m);
    
    float64 factor = 1.0 / (determinant);
    
    mat3 out_m_inverse;
    scale_adjoint_matrix3x3(out_m_inverse, factor, m);
    
    return out_m_inverse;
}


struct Rotation_Toward_Out {
    float32 value;
    float32 sign;
    float32 dot_product;
    vec3 cross_product;
};
static inline Rotation_Toward_Out rotation_toward(vec3 dst, vec3 src, float32 scalar, float32 dt)
{
    float32 dot_product = glm::dot(dst, src);
    vec3 cr = glm::cross(src, dst);
    float32 sign = glm::dot(cr, vec3(0.0f,0.0f,1.0f)) < 0 ? -1.0f : 1.0f;
    float32 rot_by = sign * scalar * glm::distance(dst, src) * dt;
    
    return {
        .value = rot_by,
        .sign = sign,
        
        .dot_product = dot_product,
        .cross_product = cr,
    };
}

}



#endif
