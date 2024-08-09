#include "commands.hpp"

#define STB_PERLIN_IMPLEMENTATION
#include "stb_perlin.h"

struct Vertex {
	vec4  position;
	uint16 entity_id;

	uint16 padding__;
};



struct MTT_Core {
	mem::Allocator allocator = {};
	mem::Arena mem_arena_per_frame = {};
	float32 time = 0.0f;
} *core = nullptr;


struct Clay_Vertex_Attribs_Default {
	vec3 aPos;
	vec3 aRot;
	vec2 aUV;
	float32 aRGB;
	float32 wt[6];
	float32 pad__;
};

void print(Clay_Vertex_Attribs_Default* v) {
	MTT_print(
		"(Vertex) { \
			aPos={%f,%f,%f},\n\
			aRot={%f,%f,%f},\n\
			aUV={%f,%f},\n\
			aRGB={%f},\n\
			wt[0]={%f},\n\
			wt[1]={%f},\n\
			wt[2]={%f},\n\
			wt[3]={%f},\n\
			wt[4]={%f},\n\
			wt[5]={%f}\n\
		}\n",
		v->aPos.x,
		v->aPos.y,
		v->aPos.z,
		v->aRot.x,v->aRot.y,v->aRot.z,
		v->aUV.x, v->aUV.y,
		v->aRGB,
		v->wt[0],
		v->wt[1],
		v->wt[2],
		v->wt[3],
		v->wt[4],
		v->wt[5]
		);
}
struct Clay_Quad_Vertex_Attribs_Default {
	Clay_Vertex_Attribs_Default verts[6];
	Clay_Vertex_Attribs_Default verts_reverse[6];
};


extern "C" {


EXPOSE_API int32 setup(void)
{
	auto alloc = mem::Heap_Allocator();
	
	core = mem::alloc_init<MTT_Core>(&alloc);
	core->allocator = alloc;


	return 0;
}




EXPOSE_API void on_frame(float32 time_s) 
{
	core->time = time_s;
}


EXPOSE_API void* w_alloc(usize32 byte_count)
{
	return mem::allocate(&core->allocator, byte_count);
}
EXPOSE_API void* w_allocate(usize32 byte_count)
{
	return w_alloc(byte_count);
}
EXPOSE_API void w_free(void* ptr)
{
	mem::deallocate(&core->allocator, ptr, 0);
}
EXPOSE_API void w_deallocate(void* ptr)
{
	w_free(ptr);
}

#define SIZEOF_QUAD (sizeof(Clay_Vertex_Attribs_Default) 6 * 2); // both sides
EXPOSE_API Clay_Quad_Vertex_Attribs_Default* Clay_allocate_quads(isize32 count)
{
	MTT_print("WASM: quad_buffer allocating: %lu\n", sizeof(Clay_Quad_Vertex_Attribs_Default));
	return (Clay_Quad_Vertex_Attribs_Default*)w_allocate(sizeof(Clay_Quad_Vertex_Attribs_Default) * count);
}
EXPOSE_API void Clay_deallocate_quads(Clay_Quad_Vertex_Attribs_Default* ptr)
{
	return w_deallocate(ptr);
}

// float noise(vec3 point) { 
// 	namespace _ = glm;
// 	float r = 0.; for (int i=0;i<16;i++) {
// 	vec3 D, p = point + _::mod(vec3(float(i),float(i/4),float(i/8)) , vec3(4.0f,2.0f,2.0f)) +
// 	   1.7f*_::sin(vec3(float(i),float(5*i),float(8*i))), C=_::floor(p), P=p-C-.5f, A=_::abs(P);
// 	C += _::mod(C.x+C.y+C.z,2.f) * _::step(_::max(
// 		vec3(A.y, A.z, A.x), vec3(A.z, A.x, A.y)
// 	),A) * _::sign(P);
// 	D=34.0f*_::sin(987.0f*float(i)+876.f*C+76.f*vec3(C.y, C.z, C.x)+765.f*vec3(C.z, C.x, C.y));P=p-C-.5f;
// 	r+=_::sin(6.3f*_::dot(P,_::fract(D)-.5f))*_::pow(_::max(0.f,1.f-2.f*_::dot(P,P)),4.f);
// 	} 
// 	return .5f * _::sin(r); 
// }

float noise(vec3 point)
{
	return stb_perlin_noise3(point.x, point.y, point.z, 0,0,0);
}

EXPOSE_API float32 noise_xyz(float32 x, float32 y, float32 z) 
{
	return noise(vec3(x, y, z));
} 

EXPOSE_API void DEMO_apply_noise(vec3* dst, isize32 count, float32 scale)
{
	for (isize32 i = 0; i < count; i += 1) {
		dst[i].x = noise_xyz(core->time * i * 20, core->time * i, core->time * i * core->time) * scale;
		dst[i].y = noise_xyz(core->time * i , core->time * i, core->time * i * core->time) * scale;
	}
}

EXPOSE_API void Clay_init_quads(Clay_Quad_Vertex_Attribs_Default* attribs, isize32 count, 
	vec3* pos_buffer, vec3* rot_buffer, float32* color_buffer, vec2* dim_buffer)
{
	// MTT_print("Init quads input: count=%d, pos={%f,%f,%f} rot={%f,%f,%f}, color=%f, dim={%f,%f}\n",
	// 	count, 
	// 	pos_buffer->x, pos_buffer->y, pos_buffer->z,
	// 	rot_buffer->x, rot_buffer->y, rot_buffer->z,
	// 	*color_buffer,
	// 	dim_buffer->x,dim_buffer->y);

	memset(attribs, 0, sizeof(Clay_Quad_Vertex_Attribs_Default) * count);

	static vec2 uvtl = vec2(0.0f, 0.0f);
	static vec2 uvbl = vec2(0.0f, 1.0f);
	static vec2 uvbr = vec2(1.0f, 1.0f);
	static vec2 uvtr = vec2(1.0f, 0.0f);

	for (isize32 i = 0; i < count; i += 1) {
		auto* quad = &attribs[i];

		vec3 pos    = pos_buffer[i];
		vec3 rot    = rot_buffer[i];
		float32 rgb = color_buffer[i];
		vec2 dim    = dim_buffer[i];


		vec3 tl = vec3(pos.x - dim.x, pos.y + dim.y, pos.z);
		vec3 bl = vec3(pos.x - dim.x, pos.y - dim.y, pos.z);
		vec3 br = vec3(pos.x + dim.x, pos.y - dim.y, pos.z);
		vec3 tr = vec3(pos.x + dim.x, pos.y + dim.y, pos.z);


		Clay_Vertex_Attribs_Default* verts = (Clay_Vertex_Attribs_Default*)quad->verts;
		{
			verts[0] = (Clay_Vertex_Attribs_Default) {
				.aPos = tl,
				.aRot = rot,
				.aUV  = uvtl,
				.aRGB = rgb,
			};
			verts[0].wt[0] = 1.0f;
			
			verts[1] = (Clay_Vertex_Attribs_Default) {
				.aPos = bl,
				.aRot = rot,
				.aUV  = uvbl,
				.aRGB = rgb,
			};
			verts[1].wt[0] = 1.0f;

			verts[2] = (Clay_Vertex_Attribs_Default) {
				.aPos = br,
				.aRot = rot,
				.aUV  = uvbr,
				.aRGB = rgb,
			};
			verts[2].wt[0] = 1.0f;

			verts[3] = verts[2];
			verts[4] = (Clay_Vertex_Attribs_Default) {
				.aPos = tr,
				.aRot = rot,
				.aUV  = uvtr,
				.aRGB = rgb,
			};
			verts[4].wt[0] = 1.0f;

			verts[5] = verts[0];
		}
		Clay_Vertex_Attribs_Default* verts_reverse = (Clay_Vertex_Attribs_Default*)quad->verts_reverse;
		verts_reverse[0] = verts[2];
		verts_reverse[1] = verts[1];
		verts_reverse[2] = verts[0];
		verts_reverse[3] = verts[5];
		verts_reverse[4] = verts[4];
		verts_reverse[5] = verts[3];
		// for (isize32 _ = 0; _ < 6; _ += 1) {
		// 	MTT_print("VERTEX %d\n", _);
		// 	print(&verts[_]);
		// }
	}
}
#undef SIZEOF_QUAD


EXPOSE_API void test_data_types(int32 i32__, uint64 i64__, float32 f32__, float32* v2__, float32* v3__, float32* v4__)
{
	i32_print(i32__);
	print_endl();

	i64_print(i64__);
	print_endl();

	f32_print(f32__);
	print_endl();

	v2_print(v2__);
	print_endl();

	v3_print(v3__);
	print_endl();

	v4_print(v4__);
	print_endl();

	w_deallocate(v2__);
	w_deallocate(v3__);
	w_deallocate(v4__);


	MTT_print("sizeof u16=[%lu]\n", sizeof(uint16));
}

usize32 snapshot_count = 0;
EXPOSE_API usize32 test_get_snapshot_count(void)
{
	return snapshot_count;
}
EXPOSE_API void test_next_snapshot(void)
{
	snapshot_count += 1;
}

EXPOSE_API usize Vertex_sizeof(void)
{
	return sizeof(Vertex);
}

EXPOSE_API void test_vertex_buffer_fill(Vertex* v_buffer, usize32 count)
{
	for (usize32 i = 0; i < count; i += 1) {
		v_buffer[i] = {
			.position = {i, i * 2, i * 3 , 1},
			.entity_id = (u16)i
		};
	}
	for (isize i = 0; i < count; i += 1) {
		MTT_print(
		"(Vertex) { \n\
		    position = {%f, %f, %f, %f} \n\
			entity_id = %u\n\
		}\n", 
			v_buffer[i].position[0],
			v_buffer[i].position[1],
			v_buffer[i].position[2],
			v_buffer[i].position[3],

			v_buffer[i].entity_id
		);
	}
}


}
